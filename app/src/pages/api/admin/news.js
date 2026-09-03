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
      const { rows } = await getDbPool().query(
        "SELECT key, category, title_fr AS title, summary_fr AS summary, image_url AS \"imageUrl\", embed_url AS \"embedUrl\", link_url AS \"linkUrl\", link_label AS \"linkLabel\", video_display_mode AS \"videoDisplayMode\", published, archived, display_order, published_at AS \"publishedAt\" FROM news_items ORDER BY archived ASC, display_order, id",
      );
      return res.status(200).json({ news: rows });
    }

    if (req.method === "POST") {
      const { category, title, summary, imageUrl, embedUrl, linkUrl, linkLabel, videoDisplayMode, published, archived, display_order } = req.body || {};
      if (typeof category !== "string" || !category.trim() || typeof title !== "string" || !title.trim() || typeof summary !== "string" || !summary.trim() || !isOptionalUrl(imageUrl) || !isOptionalUrl(embedUrl) || !isOptionalUrl(linkUrl) || typeof published !== "boolean" || typeof archived !== "boolean") {
        return res.status(400).json({ error: "Invalid news item" });
      }

      const safeOrder = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;
      const safeVideoMode = (videoDisplayMode === "thumbnail" || videoDisplayMode === "iframe") ? videoDisplayMode : "iframe";
      const generatedKey = `news_${Date.now()}`;
      const { rows } = await getDbPool().query(
        "INSERT INTO news_items (key, category, title_fr, summary_fr, image_url, embed_url, link_url, link_label, video_display_mode, published, archived, display_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING key, category, title_fr AS title, summary_fr AS summary, image_url AS \"imageUrl\", embed_url AS \"embedUrl\", link_url AS \"linkUrl\", link_label AS \"linkLabel\", video_display_mode AS \"videoDisplayMode\", published, archived, display_order, published_at AS \"publishedAt\"",
        [generatedKey, category.trim(), title.trim(), summary.trim(), imageUrl || null, normalizeEmbedUrl(embedUrl || ""), linkUrl || null, typeof linkLabel === "string" ? linkLabel.trim() : "", safeVideoMode, published, archived, safeOrder],
      );
      return res.status(201).json({ newsItem: rows[0] });
    }

    if (req.method === "PATCH") {
      const { key, category, title, summary, imageUrl, embedUrl, linkUrl, linkLabel, videoDisplayMode, published, archived, display_order } = req.body || {};
      if (typeof key !== "string" || !key.trim() || typeof category !== "string" || !category.trim() || typeof title !== "string" || !title.trim() || typeof summary !== "string" || !summary.trim() || !isOptionalUrl(imageUrl) || !isOptionalUrl(embedUrl) || !isOptionalUrl(linkUrl) || typeof published !== "boolean" || typeof archived !== "boolean") {
        return res.status(400).json({ error: "Invalid news item" });
      }

      const safeOrder = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;
      const safeVideoMode = (videoDisplayMode === "thumbnail" || videoDisplayMode === "iframe") ? videoDisplayMode : "iframe";
      const { rows } = await getDbPool().query(
        "UPDATE news_items SET category = $1, title_fr = $2, summary_fr = $3, image_url = $4, embed_url = $5, link_url = $6, link_label = $7, video_display_mode = $8, published = $9, archived = $10, display_order = $11, published_at = CASE WHEN $9 THEN COALESCE(published_at, NOW()) ELSE NULL END, updated_at = NOW() WHERE key = $12 RETURNING key, category, title_fr AS title, summary_fr AS summary, image_url AS \"imageUrl\", embed_url AS \"embedUrl\", link_url AS \"linkUrl\", link_label AS \"linkLabel\", video_display_mode AS \"videoDisplayMode\", published, archived, display_order, published_at AS \"publishedAt\"",
        [category.trim(), title.trim(), summary.trim(), imageUrl || null, normalizeEmbedUrl(embedUrl || ""), linkUrl || null, typeof linkLabel === "string" ? linkLabel.trim() : "", safeVideoMode, published, archived, safeOrder, key.trim()],
      );
      if (!rows[0]) return res.status(404).json({ error: "News item not found" });
      return res.status(200).json({ newsItem: rows[0] });
    }

    if (req.method === "DELETE") {
      const { key } = req.body || {};
      if (typeof key !== "string" || !key.trim()) {
        return res.status(400).json({ error: "Invalid key" });
      }

      const { rowCount } = await getDbPool().query("DELETE FROM news_items WHERE key = $1", [key.trim()]);
      if (!rowCount) return res.status(404).json({ error: "News item not found" });
      return res.status(204).send();
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to load admin news", error);
    return res.status(503).json({ error: "Admin news unavailable" });
  }
}
