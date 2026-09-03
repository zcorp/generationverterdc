import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { ensurePublicContentSchema, getDbPool } from "../../../lib/db";

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

    const key = typeof req.query?.key === "string" ? req.query.key : req.body?.key;
    const validKeys = ["join_page", "contact_page", "home_page", "about_page", "pillars_page"];

    if (req.method === "GET") {
      if (key && !validKeys.includes(key)) {
        return res.status(400).json({ error: "Invalid settings key" });
      }

      const targetKeys = key ? [key] : validKeys;
      const query = "SELECT key, content FROM site_settings WHERE key = ANY($1::text[]) ORDER BY key";
      const { rows } = await getDbPool().query(query, [targetKeys]);
      const payload = Object.fromEntries(rows.map((row) => [row.key, row.content || {}]));
      return res.status(200).json({ settings: payload, keys: targetKeys });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      const content = req.body?.content;
      if (typeof key !== "string" || !validKeys.includes(key) || !content || typeof content !== "object") {
        return res.status(400).json({ error: "Invalid site settings payload" });
      }

      const { rows } = await getDbPool().query(
        `INSERT INTO site_settings (key, content, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         ON CONFLICT (key)
         DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
         RETURNING key, content`,
        [key, JSON.stringify(content)],
      );

      return res.status(200).json({ settings: rows[0] });
    }

    if (req.method === "DELETE") {
      if (typeof key !== "string" || !validKeys.includes(key)) {
        return res.status(400).json({ error: "Invalid settings key" });
      }

      const { rowCount } = await getDbPool().query("DELETE FROM site_settings WHERE key = $1", [key]);
      return rowCount ? res.status(204).send() : res.status(404).json({ error: "Settings not found" });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to load site settings", error);
    return res.status(503).json({ error: "Site settings unavailable" });
  }
}
