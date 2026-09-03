import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/authOptions";
import { ensureAdminSchema, hashAdminPassword } from "../../../lib/adminAuth";
import { getDbPool } from "../../../lib/db";

async function requireSuperAdmin(req, res) {
  if (process.env.ADMIN_AUTH_MODE === "disabled" && process.env.NODE_ENV !== "production") return { role: "super_admin" };

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    res.status(403).json({ error: "Super-admin privileges required" });
    return null;
  }
  return session.user;
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 12;
}

export default async function handler(req, res) {
  const actor = await requireSuperAdmin(req, res);
  if (!actor) return;

  try {
    await ensureAdminSchema();

    if (req.method === "GET") {
      const { rows } = await getDbPool().query(
        `SELECT id, email, display_name, role, is_active, last_login_at, created_at, updated_at
         FROM admin_users ORDER BY created_at DESC`,
      );
      return res.status(200).json({ admins: rows });
    }

    if (req.method === "POST") {
      const { email, password, displayName, role = "admin" } = req.body || {};
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!normalizedEmail.includes("@") || !validatePassword(password) || !["admin", "super_admin"].includes(role)) {
        return res.status(400).json({ error: "Email valide, mot de passe de 12 caracteres minimum et role requis" });
      }

      const passwordHash = await hashAdminPassword(password);
      const { rows } = await getDbPool().query(
        `INSERT INTO admin_users (email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, role, is_active, created_at`,
        [normalizedEmail, passwordHash, String(displayName || "").trim(), role],
      );
      return res.status(201).json({ admin: rows[0] });
    }

    if (req.method === "PATCH") {
      const { id, isActive, password, displayName, role } = req.body || {};
      if (!id) return res.status(400).json({ error: "Admin id is required" });
      if (password !== undefined && !validatePassword(password)) return res.status(400).json({ error: "Mot de passe de 12 caracteres minimum requis" });
      if (role !== undefined && !["admin", "super_admin"].includes(role)) return res.status(400).json({ error: "Role invalide" });
      if (Number(id) === Number(actor.id) && isActive === false) return res.status(400).json({ error: "Cannot deactivate your own account" });

      const fields = [];
      const values = [];
      const add = (sql, value) => { fields.push(`${sql} = $${values.length + 1}`); values.push(value); };
      if (isActive !== undefined) add("is_active", Boolean(isActive));
      if (displayName !== undefined) add("display_name", String(displayName).trim());
      if (role !== undefined) add("role", role);
      if (password !== undefined) add("password_hash", await hashAdminPassword(password));
      if (!fields.length) return res.status(400).json({ error: "No changes supplied" });
      values.push(id);

      const { rows } = await getDbPool().query(
        `UPDATE admin_users SET ${fields.join(", ")}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING id, email, display_name, role, is_active, last_login_at, created_at, updated_at`,
        values,
      );
      if (!rows[0]) return res.status(404).json({ error: "Admin not found" });
      return res.status(200).json({ admin: rows[0] });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Un compte admin existe deja avec cet email" });
    console.error("Unable to manage admin accounts", error);
    return res.status(503).json({ error: "Admin registry unavailable" });
  }
}
