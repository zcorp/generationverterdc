import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { ensurePublicContentSchema, getDbPool } from "../../../lib/db";
import { sendReplyEmail } from "../../../lib/email";
import { isLikelySpamSubmission, normalizeEmail, upsertUserProfile } from "../../../lib/userManagement";

const rateLimitBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ipAddress) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (rateLimitBuckets.get(ipAddress) || []).filter((time) => now - time < windowMs);
  recent.push(now);
  rateLimitBuckets.set(ipAddress, recent);
  return recent.length <= 5;
}

async function requireAdmin(req, res) {
  if (process.env.ADMIN_AUTH_MODE === "disabled" && process.env.NODE_ENV !== "production") {
    return true;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }

  return true;
}

function normalizeSubmissionStatus(value) {
  const allowed = ["new", "in_progress", "responded", "closed"];
  return allowed.includes(value) ? value : "new";
}

export default async function handler(req, res) {
  if (req.method !== "POST" && !(await requireAdmin(req, res))) return;

  try {
    await ensurePublicContentSchema();

    if (req.method === "GET") {
      const { rows } = await getDbPool().query(
        `SELECT id, submission_type, source_page, name, email, phone, subject, channel, message, consent, status, admin_reply, replied_at, reviewed_by, payload, created_at
         FROM form_submissions
         ORDER BY created_at DESC`,
      );

      return res.status(200).json({ submissions: rows });
    }

    if (req.method === "POST") {
      const { submissionType, sourcePage, name, email, phone, subject, channel, message, consent, payload, website, captchaVerified } = req.body || {};
      const validTypes = ["volunteer", "partnership", "contact", "newsletter"];
      if (!validTypes.includes(submissionType) || typeof sourcePage !== "string" || !sourcePage.trim()) {
        return res.status(400).json({ error: "Invalid submission payload" });
      }

      const ipAddress = getClientIp(req);
      if (!checkRateLimit(ipAddress)) {
        return res.status(429).json({ error: "Trop de demandes depuis cette adresse. Réessayez plus tard." });
      }

      const record = {
        submission_type: submissionType,
        source_page: sourcePage.trim(),
        name: typeof name === "string" ? name.trim() : null,
        email: typeof email === "string" ? normalizeEmail(email) || null : null,
        phone: typeof phone === "string" ? phone.trim() || null : null,
        subject: typeof subject === "string" ? subject.trim() || null : null,
        channel: typeof channel === "string" ? channel.trim() || null : null,
        message: typeof message === "string" ? message.trim() || null : null,
        consent: Boolean(consent),
        website: typeof website === "string" ? website.trim() : "",
        captchaVerified: Boolean(captchaVerified),
        payload: payload && typeof payload === "object" ? payload : {},
      };

      if (submissionType === "newsletter") {
        if (!record.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
          return res.status(400).json({ error: "Une adresse email valide est obligatoire." });
        }
        if (!record.consent) {
          return res.status(400).json({ error: "Votre consentement est obligatoire pour l'inscription." });
        }
        record.name = record.name || "Abonné newsletter";
      }

      if (submissionType !== "newsletter" && (!record.name || !record.phone)) {
        return res.status(400).json({ error: "Le nom et le numéro de téléphone sont obligatoires." });
      }

      if (record.message && record.message.length < 20 && submissionType === "volunteer") {
        return res.status(400).json({ error: "Votre message est trop court pour une candidature valide." });
      }

      if (record.website || isLikelySpamSubmission({ ...record.payload, website: record.website, email: record.email, phone: record.phone, message: record.message })) {
        return res.status(400).json({ error: "Votre candidature semble invalide. Vérifiez les informations saisies." });
      }

      const captchaRequired = process.env.REQUIRE_CAPTCHA === "true";
      if (captchaRequired && !record.captchaVerified) {
        return res.status(400).json({ error: "La vérification anti-bot est obligatoire." });
      }

      let userId = null;
      if (record.email) {
        const profile = upsertUserProfile({
          email: record.email,
          name: record.name,
          phone: record.phone,
          submissionType: record.submission_type,
          consent: record.consent,
          sourcePage: record.source_page,
        });

        const userResult = await getDbPool().query(
          `INSERT INTO users (email, first_name, last_name, phone, role, source_type, source_page, consent_email, consent_sms, consent_communication, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
           ON CONFLICT (email)
           DO UPDATE SET
             first_name = COALESCE(EXCLUDED.first_name, users.first_name),
             last_name = COALESCE(EXCLUDED.last_name, users.last_name),
             phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
             role = EXCLUDED.role,
             source_type = EXCLUDED.source_type,
             source_page = EXCLUDED.source_page,
             consent_email = users.consent_email OR EXCLUDED.consent_email,
             consent_sms = users.consent_sms OR EXCLUDED.consent_sms,
             consent_communication = users.consent_communication OR EXCLUDED.consent_communication,
             status = CASE WHEN EXCLUDED.status = 'banned' THEN 'banned' ELSE users.status END,
             updated_at = NOW()
           RETURNING id`,
          [
            profile.email,
            profile.first_name,
            profile.last_name,
            profile.phone,
            profile.role,
            profile.source_type,
            profile.source_page,
            profile.consent_email,
            profile.consent_sms,
            profile.consent_communication,
            profile.status,
          ],
        );

        userId = userResult.rows[0]?.id || null;
      }

      const { rows } = await getDbPool().query(
        `INSERT INTO form_submissions (
          user_id, submission_type, source_page, name, email, phone, subject, channel, message, consent, status, ip_address, user_agent, is_human_verified, spam_score, payload,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', $11, $12, $13, $14, $15::jsonb, NOW(), NOW())
        RETURNING id, user_id, submission_type, source_page, name, email, phone, subject, channel, message, consent, status, admin_reply, replied_at, reviewed_by, payload, created_at`,
        [
          userId,
          record.submission_type,
          record.source_page,
          record.name,
          record.email,
          record.phone,
          record.subject,
          record.channel,
          record.message,
          record.consent,
          ipAddress,
          req.headers["user-agent"] || "",
          Boolean(captchaVerified),
          0,
          JSON.stringify(record.payload),
        ],
      );

      return res.status(201).json({ submission: rows[0] });
    }

    if (req.method === "PATCH") {
      const { id, status, adminReply, reviewedBy, sendMail } = req.body || {};
      if (!id || Number.isNaN(Number(id))) {
        return res.status(400).json({ error: "Invalid submission id" });
      }

      const normalizedStatus = normalizeSubmissionStatus(status || "new");
      const safeReply = typeof adminReply === "string" ? adminReply.trim() : "";
      const safeReviewer = typeof reviewedBy === "string" ? reviewedBy.trim() : "admin";
      const shouldSendMail = Boolean(sendMail) && Boolean((req.body || {}).email || req.body?.recipientEmail);

      let emailResult = null;
      if (shouldSendMail && safeReply) {
        const recipientEmail = typeof req.body?.recipientEmail === "string" && req.body.recipientEmail.trim()
          ? req.body.recipientEmail.trim()
          : typeof req.body?.email === "string" && req.body.email.trim()
            ? req.body.email.trim()
            : null;

        if (recipientEmail) {
          emailResult = await sendReplyEmail({
            name: req.body?.name || "Madame, Monsieur",
            email: recipientEmail,
            submissionType: req.body?.submissionType || "contact",
            replyText: safeReply,
          });
        }
      }

      const { rows } = await getDbPool().query(
        `UPDATE form_submissions
         SET status = $1,
             admin_reply = $2,
             replied_at = CASE WHEN $2 = '' THEN replied_at ELSE COALESCE(replied_at, NOW()) END,
             reviewed_by = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, submission_type, source_page, name, email, phone, subject, channel, message, consent, status, admin_reply, replied_at, reviewed_by, payload, created_at`,
        [normalizedStatus, safeReply, safeReviewer, Number(id)],
      );

      if (!rows[0]) {
        return res.status(404).json({ error: "Submission not found" });
      }

      return res.status(200).json({
        submission: rows[0],
        email: emailResult || { ok: false, mode: "disabled", reason: "No email sent" },
      });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to load submissions", error);
    return res.status(503).json({ error: "Submission storage unavailable" });
  }
}
