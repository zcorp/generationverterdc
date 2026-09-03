import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { ensurePublicContentSchema, getDbPool } from "../../../lib/db";

async function requireAdmin(req, res) {
  if (process.env.ADMIN_AUTH_MODE === "disabled") {
    if (process.env.NODE_ENV !== "production") return { user: { email: "local-development@gv-rdc.local" } };
    res.status(503).json({ error: "Admin authentication is not configured" });
    return null;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return session;
}

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  try {
    await ensurePublicContentSchema();

    if (req.method === "GET") {
      const { rows } = await getDbPool().query("SELECT key, value, label_fr AS label, label_en, published, display_order FROM impact_stats ORDER BY display_order, id");
      return res.status(200).json({ impactStats: rows });
    }

    if (req.method === "POST") {
      const { value, label, label_en: labelEn, published, display_order } = req.body || {};
      if (typeof value !== "string" || !value.trim() || typeof label !== "string" || !label.trim() || typeof published !== "boolean") {
        return res.status(400).json({ error: "Invalid impact stat" });
      }

      const safeOrder = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;
      const generatedKey = `stat_${Date.now()}`;
      const { rows } = await getDbPool().query(
        "INSERT INTO impact_stats (key, value, label_fr, label_en, published, display_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING key, value, label_fr AS label, label_en, published, display_order",
        [generatedKey, value.trim(), label.trim(), typeof labelEn === "string" ? labelEn.trim() : null, published, safeOrder],
      );
      return res.status(201).json({ impactStat: rows[0] });
    }

    if (req.method === "PATCH") {
      const { key, value, label, label_en: labelEn, published, display_order } = req.body || {};
      if (typeof key !== "string" || !key.trim() || typeof value !== "string" || !value.trim() || typeof label !== "string" || !label.trim() || typeof published !== "boolean") {
        return res.status(400).json({ error: "Invalid impact stat" });
      }

      const safeOrder = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;
      const { rows } = await getDbPool().query(
        "UPDATE impact_stats SET value = $1, label_fr = $2, label_en = $3, published = $4, display_order = $5, updated_at = NOW() WHERE key = $6 RETURNING key, value, label_fr AS label, label_en, published, display_order",
        [value.trim(), label.trim(), typeof labelEn === "string" ? labelEn.trim() : null, published, safeOrder, key.trim()],
      );
      if (!rows[0]) return res.status(404).json({ error: "Impact stat not found" });
      return res.status(200).json({ impactStat: rows[0] });
    }

    if (req.method === "DELETE") {
      const { key } = req.body || {};
      if (typeof key !== "string" || !key.trim()) {
        return res.status(400).json({ error: "Invalid key" });
      }

      const { rowCount } = await getDbPool().query("DELETE FROM impact_stats WHERE key = $1", [key.trim()]);
      if (!rowCount) return res.status(404).json({ error: "Impact stat not found" });
      return res.status(204).send();
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to load admin impact stats", error);
    return res.status(503).json({ error: "Admin data unavailable" });
  }
}