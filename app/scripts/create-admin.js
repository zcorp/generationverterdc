import { ensureAdminSchema, findAdminByEmail, hashAdminPassword } from "../src/lib/adminAuth.js";
import { getDbPool } from "../src/lib/db.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const displayName = String(process.env.ADMIN_NAME || "Super administrateur").trim();

if (!email || !password || password.length < 12) {
  console.error("ADMIN_EMAIL et ADMIN_PASSWORD (12 caracteres minimum) sont requis.");
  process.exit(1);
}

await ensureAdminSchema();
const existing = await findAdminByEmail(email);
const passwordHash = await hashAdminPassword(password);

if (existing) {
  await getDbPool().query(
    `UPDATE admin_users
     SET password_hash = $1, display_name = $2, role = 'super_admin', is_active = TRUE, updated_at = NOW()
     WHERE id = $3`,
    [passwordHash, displayName, existing.id],
  );
  console.log(`Compte super-admin mis a jour: ${email}`);
} else {
  await getDbPool().query(
    `INSERT INTO admin_users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, 'super_admin')`,
    [email, passwordHash, displayName],
  );
  console.log(`Compte super-admin cree: ${email}`);
}

await getDbPool().end();
