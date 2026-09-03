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

function isOptionalUrl(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("data:image/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeEmbedUrl(value) {
  if (!value) return null;
  if (value.startsWith("data:image/")) return value;
  const url = new URL(value);
  if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
    const videoId = url.searchParams.get("v");
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.slice(1).split("/")[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  return value;
}

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  try {
    await ensurePublicContentSchema();

    if (req.method === "GET") {
      const { rows } = await getDbPool().query("SELECT key, type, tag, title_fr AS title, copy_fr AS copy, url, thumbnail, link_url AS \"linkUrl\", link_label AS \"linkLabel\", video_display_mode AS \"videoDisplayMode\", published, archived, display_order FROM media_items ORDER BY archived ASC, display_order, id");
      return res.status(200).json({ media: rows });
    }

    if (req.method === "POST") {
      const { type, tag, title, copy, url, thumbnail, linkUrl, linkLabel, published, archived, display_order } = req.body || {};
      const validTypes = ["video", "resource", "activity"];
      if (!validTypes.includes(type) || typeof tag !== "string" || !tag.trim() || typeof title !== "string" || !title.trim() || typeof copy !== "string" || !copy.trim() || !isOptionalUrl(url) || !isOptionalUrl(thumbnail) || !isOptionalUrl(linkUrl) || typeof published !== "boolean" || typeof archived !== "boolean") {
        return res.status(400).json({ error: "Invalid media item" });
      }

      const safeOrder = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;
      const generatedKey = `media_${Date.now()}`;
      const embedUrl = normalizeEmbedUrl(url || "");
      const { rows } = await getDbPool().query(
        "INSERT INTO media_items (key, type, tag, title_fr, copy_fr, url, thumbnail, link_url, link_label, published, archived, display_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING key, type, tag, title_fr AS title, copy_fr AS copy, url, thumbnail, link_url AS \"linkUrl\", link_label AS \"linkLabel\", published, archived, display_order",
        [generatedKey, type, tag.trim(), title.trim(), copy.trim(), embedUrl, thumbnail || null, linkUrl || null, typeof linkLabel === "string" ? linkLabel.trim() : "", published, archived, safeOrder],
      );
      return res.status(201).json({ mediaItem: rows[0] });
    }

    if (req.method === "PATCH") {
      const { key, type, tag, title, copy, url, thumbnail, linkUrl, linkLabel, published, archived, display_order } = req.body || {};
      const validTypes = ["video", "resource", "activity"];
      if (typeof key !== "string" || !key.trim() || !validTypes.includes(type) || typeof tag !== "string" || !tag.trim() || typeof title !== "string" || !title.trim() || typeof copy !== "string" || !copy.trim() || !isOptionalUrl(url) || !isOptionalUrl(thumbnail) || !isOptionalUrl(linkUrl) || typeof published !== "boolean" || typeof archived !== "boolean") {
        return res.status(400).json({ error: "Invalid media item" });
      }

      const safeOrder = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;
      const embedUrl = normalizeEmbedUrl(url || "");
      const { rows } = await getDbPool().query(
        "UPDATE media_items SET type = $1, tag = $2, title_fr = $3, copy_fr = $4, url = $5, thumbnail = $6, link_url = $7, link_label = $8, published = $9, archived = $10, display_order = $11, published_at = CASE WHEN $9 THEN COALESCE(published_at, NOW()) ELSE NULL END, updated_at = NOW() WHERE key = $12 RETURNING key, type, tag, title_fr AS title, copy_fr AS copy, url, thumbnail, link_url AS \"linkUrl\", link_label AS \"linkLabel\", published, archived, display_order",
        [type, tag.trim(), title.trim(), copy.trim(), embedUrl, thumbnail || null, linkUrl || null, typeof linkLabel === "string" ? linkLabel.trim() : "", published, archived, safeOrder, key.trim()],
      );
      if (!rows[0]) return res.status(404).json({ error: "Media item not found" });
      return res.status(200).json({ mediaItem: rows[0] });
    }

    if (req.method === "DELETE") {
      const { key } = req.body || {};
      if (typeof key !== "string" || !key.trim()) {
        return res.status(400).json({ error: "Invalid key" });
      }

      const { rowCount } = await getDbPool().query("DELETE FROM media_items WHERE key = $1", [key.trim()]);
      if (!rowCount) return res.status(404).json({ error: "Media item not found" });
      return res.status(204).send();
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to load admin media", error);
    return res.status(503).json({ error: "Admin media unavailable" });
  }
}
