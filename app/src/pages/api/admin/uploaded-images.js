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

    if (req.method === "GET") {
      const { rows } = await getDbPool().query(
        "SELECT key, label, url FROM uploaded_images ORDER BY created_at DESC, id DESC",
      );
      return res.status(200).json({ images: rows });
    }

    if (req.method === "POST") {
      const { dataUrl, label } = req.body || {};
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/") || typeof label !== "string") {
        return res.status(400).json({ error: "Invalid uploaded image" });
      }

      const generatedKey = `img_${Date.now()}`;
      const safeLabel = label.trim() || "Image locale";
      const { rows } = await getDbPool().query(
        "INSERT INTO uploaded_images (key, label, url, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING key, label, url",
        [generatedKey, safeLabel, dataUrl],
      );
      return res.status(201).json({ image: rows[0] });
    }

    if (req.method === "DELETE") {
      const { key } = req.body || {};
      if (typeof key !== "string" || !key.trim()) {
        return res.status(400).json({ error: "Invalid key" });
      }

      const { rowCount } = await getDbPool().query("DELETE FROM uploaded_images WHERE key = $1", [key.trim()]);
      if (!rowCount) return res.status(404).json({ error: "Uploaded image not found" });
      return res.status(204).send();
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Unable to load uploaded images", error);
    return res.status(503).json({ error: "Uploaded images unavailable" });
  }
}
