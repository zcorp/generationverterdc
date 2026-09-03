import crypto from "crypto";
import { promisify } from "util";
import { getDbPool } from "./db.js";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export async function ensureAdminSchema() {
  await getDbPool().query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_idx
      ON admin_users (LOWER(email));
  `);
}

export async function hashAdminPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyAdminPassword(password, storedHash) {
  const [algorithm, salt, expectedHex] = String(storedHash || "").split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function findAdminByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { rows } = await getDbPool().query(
    `SELECT id, email, password_hash, display_name, role, is_active
     FROM admin_users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalizedEmail],
  );
  return rows[0] || null;
}

export async function touchAdminLogin(id) {
  await getDbPool().query(
    "UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1",
    [id],
  );
}
