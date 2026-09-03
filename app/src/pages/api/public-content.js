import { ensurePublicContentSchema, getDbPool } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await ensurePublicContentSchema();

    const { rows: impactStats } = await getDbPool().query(
      "SELECT key, value, label_fr AS label FROM impact_stats WHERE published = TRUE ORDER BY display_order, id",
    );
    const { rows: media } = await getDbPool().query(
      "SELECT key, type, tag, title_fr AS title, copy_fr AS copy, thumbnail, url AS \"embedUrl\", link_url AS \"linkUrl\", link_label AS \"linkLabel\" FROM media_items WHERE published = TRUE AND archived = FALSE ORDER BY display_order, id",
    );
    const { rows: news } = await getDbPool().query(
      "SELECT key, category, title_fr AS title, summary_fr AS summary, image_url AS \"imageUrl\", embed_url AS \"embedUrl\", link_url AS \"linkUrl\", link_label AS \"linkLabel\", published_at AS \"publishedAt\" FROM news_items WHERE published = TRUE AND archived = FALSE ORDER BY display_order, id",
    );
    const { rows: settingsRows } = await getDbPool().query(
      "SELECT key, content FROM site_settings WHERE key IN ('contact_page', 'join_page', 'home_page', 'about_page', 'pillars_page')",
    );
    const settings = Object.fromEntries(
      settingsRows.map((row) => [row.key, row.content || {}]),
    );
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json({ impactStats, media, news, settings });
  } catch (error) {
    console.error("Unable to load public content", error);
    return res.status(503).json({ error: "Public content unavailable" });
  }
}
