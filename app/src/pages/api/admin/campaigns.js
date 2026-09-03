import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { ensurePublicContentSchema, getDbPool } from "../../../lib/db";
import { sendCampaignEmail } from "../../../lib/email";
import { sendCampaignSms } from "../../../lib/mlinzi";
import { buildCampaignAudience, buildWhatsAppUrl, normalizePhoneForSms } from "../../../lib/campaigns";

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

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  try {
    await ensurePublicContentSchema();

    if (req.method === "GET") {
      const campaigns = await getDbPool().query(
        `SELECT id, name, subject, body, filters, channel, status, created_by, sent_at, recipients_count, created_at, updated_at
         FROM campaigns
         ORDER BY created_at DESC`
      );

      const deliveries = await getDbPool().query(
        `SELECT id, campaign_id, user_id, email, channel, status, response_message, sent_at, created_at
         FROM campaign_deliveries
         ORDER BY created_at DESC`
      );

      return res.status(200).json({ campaigns: campaigns.rows, deliveries: deliveries.rows });
    }

    if (req.method === "POST") {
      const { name, subject, body, filters = {}, dryRun = false, channel = "email" } = req.body || {};

      if (!name || !subject || !body) {
        return res.status(400).json({ error: "Nom, objet et contenu de la campagne sont requis." });
      }

      const validChannels = ["email", "sms", "whatsapp", "both"];
      const chosenChannel = validChannels.includes(channel) ? channel : "email";

      const { rows: users } = await getDbPool().query(
        `SELECT id, email, first_name, last_name, phone, role, status, consent_email, consent_sms, consent_communication, source_page, created_at
         FROM users
         WHERE status != 'banned'
         ORDER BY created_at DESC`
      );

      const audience = buildCampaignAudience(users, { ...filters, channel: chosenChannel });
      const recipients = audience
        .map((user) => ({
          userId: user.id,
          email: user.email,
          phone: user.phone,
          smsPhone: normalizePhoneForSms(user.phone),
          first_name: user.first_name,
          last_name: user.last_name,
          whatsappLink: buildWhatsAppUrl(user.phone, `${subject}\n\n${body}`),
        }))
        .filter((user) => chosenChannel === "email"
          ? Boolean(user.email && user.email.includes("@"))
          : chosenChannel === "sms"
            ? Boolean(user.smsPhone)
            : chosenChannel === "whatsapp"
              ? Boolean(user.phone)
              : Boolean((user.email && user.email.includes("@")) || user.phone));

      if (dryRun) {
        return res.status(200).json({ preview: { total: recipients.length, recipients: recipients.slice(0, 25), channel: chosenChannel } });
      }

      const campaignInsert = await getDbPool().query(
        `INSERT INTO campaigns (name, subject, body, filters, channel, status, created_by, recipients_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, 'sent', $6, $7, NOW(), NOW())
         RETURNING id, name, subject, body, filters, channel, status, created_by, recipients_count, created_at, updated_at`,
        [
          String(name).trim(),
          String(subject).trim(),
          String(body),
          JSON.stringify(filters || {}),
          chosenChannel,
          req.headers["x-forwarded-user"] || "admin",
          recipients.length,
        ],
      );

      const campaign = campaignInsert.rows[0];
      let delivered = 0;
      let failed = 0;

      for (const recipient of recipients) {
        const shouldSendEmail = chosenChannel === "email" || chosenChannel === "both";
        const shouldSendWhatsApp = chosenChannel === "whatsapp" || chosenChannel === "both";
        const shouldSendSms = chosenChannel === "sms";

        let emailResponse = { ok: false, mode: "disabled" };
        if (shouldSendEmail && recipient.email) {
          emailResponse = await sendCampaignEmail({
            to: recipient.email,
            subject: String(subject).trim(),
            body: String(body),
            fromName: "GV-RDC",
          });
        }

        let whatsappResponse = { ok: false, mode: "disabled", reason: "No phone number" };
        if (shouldSendWhatsApp && recipient.whatsappLink) {
          whatsappResponse = { ok: true, mode: "whatsapp", link: recipient.whatsappLink };
        }

        let smsResponse = { ok: false, mode: "disabled", reason: "Canal SMS désactivé" };
        if (shouldSendSms && recipient.smsPhone) {
          smsResponse = await sendCampaignSms({ to: recipient.smsPhone, message: body });
        }

        const finalStatus = emailResponse.ok || whatsappResponse.ok || smsResponse.ok ? "sent" : "failed";
        const responseMessage = smsResponse.ok
          ? `${smsResponse.responseMessage}${smsResponse.messageId ? ` (${smsResponse.messageId})` : ""}`
          : emailResponse.ok && whatsappResponse.ok
          ? "Email et WhatsApp préparés"
          : emailResponse.ok
            ? "Email envoyé"
            : whatsappResponse.ok
              ? "WhatsApp préparé"
              : (emailResponse.reason || whatsappResponse.reason || smsResponse.reason || "Echec d’envoi");

        await getDbPool().query(
          `INSERT INTO campaign_deliveries (campaign_id, user_id, email, channel, status, response_message, sent_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, ${finalStatus === "sent" ? "NOW()" : "NULL"}, NOW(), NOW())`,
          [campaign.id, recipient.userId, recipient.email || recipient.phone || "unknown@local", chosenChannel, finalStatus, responseMessage],
        );

        if (finalStatus === "sent") delivered += 1; else failed += 1;
      }

      await getDbPool().query(
        `UPDATE campaigns SET status = $1, sent_at = NOW(), recipients_count = $2, updated_at = NOW() WHERE id = $3`,
        [failed === recipients.length && recipients.length > 0 ? "failed" : "sent", recipients.length, campaign.id],
      );

      return res.status(201).json({
        campaign: { ...campaign, recipients_count: recipients.length, sent_count: delivered, failed_count: failed, channel: chosenChannel },
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to manage campaigns", error);
    return res.status(503).json({ error: "Campaign service unavailable" });
  }
}
