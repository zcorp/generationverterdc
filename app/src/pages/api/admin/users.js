import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { ensurePublicContentSchema, getDbPool } from "../../../lib/db";
import { sanitizeUserPayload } from "../../../lib/userManagement";

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
      const { rows } = await getDbPool().query(
        `SELECT id, email, first_name, last_name, phone, role, source_type, source_page,
                consent_email, consent_sms, consent_communication, status, created_at, updated_at
         FROM users
         ORDER BY created_at DESC`,
      );

      return res.status(200).json({ users: rows });
    }

    if (req.method === "POST") {
      const payload = sanitizeUserPayload(req.body || {});
      if (!payload.email || !payload.email.includes("@")) {
        return res.status(400).json({ error: "Email valide requis" });
      }

      const { rows } = await getDbPool().query(
        `INSERT INTO users (
          email, first_name, last_name, phone, role, source_type, source_page,
          consent_email, consent_sms, consent_communication, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, email, first_name, last_name, phone, role, source_type, source_page,
                   consent_email, consent_sms, consent_communication, status, created_at, updated_at`,
        [
          payload.email,
          payload.first_name,
          payload.last_name,
          payload.phone,
          payload.role,
          payload.source_type,
          payload.source_page,
          payload.consent_email,
          payload.consent_sms,
          payload.consent_communication,
          payload.status,
        ],
      );

      return res.status(201).json({ user: rows[0] });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Un contact avec cet email existe deja" });
    }
    console.error("Unable to load or create users", error);
    return res.status(503).json({ error: "User registry unavailable" });
  }
}
