import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

const statusLabels = {
  active: "Actif",
  pending: "En attente",
  unsubscribed: "Désabonné",
  banned: "Banni",
};

const statusOrder = ["active", "pending", "unsubscribed", "banned"];

export default function AdminUsersPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [savingUser, setSavingUser] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "volunteer",
    source_type: "volunteer",
    status: "active",
    source_page: "admin-panel",
    consent_email: true,
    consent_sms: true,
    consent_communication: true,
  });
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "admin",
  });
  const pageSize = 14;
  const isSuperAdmin = activeSession?.user?.role === "super_admin" || authMode === "disabled";

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/users")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.users) setUsers(content.users);
      })
      .catch(() => setMessage("Impossible de charger les utilisateurs."));

    if (isSuperAdmin) {
      fetch("/api/admin/admins")
        .then((response) => response.ok ? response.json() : null)
        .then((content) => {
          if (content?.admins) setAdmins(content.admins);
        })
        .catch(() => setMessage("Impossible de charger les comptes admin."));
    }
  }, [activeSession, authMode, isSuperAdmin]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  async function handleCreateUser(event) {
    event.preventDefault();
    if (!activeSession && authMode !== "disabled") return;

    setSavingUser(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const content = await response.json();
      if (!response.ok) {
        throw new Error(content?.error || "Impossible de créer le profil.");
      }

      setMessage(content.user ? `Profil ajouté : ${content.user.email}` : "Profil ajouté.");
      setUserForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "volunteer",
        source_type: "volunteer",
        status: "active",
        source_page: "admin-panel",
        consent_email: true,
        consent_sms: true,
        consent_communication: true,
      });
      const refreshed = await fetch("/api/admin/users");
      const refreshedContent = await refreshed.json();
      if (refreshedContent?.users) setUsers(refreshedContent.users);
    } catch (error) {
      setMessage(error.message || "Impossible de créer le profil.");
    } finally {
      setSavingUser(false);
    }
  }

  async function handleCreateAdmin(event) {
    event.preventDefault();
    if (!isSuperAdmin) return;

    setSavingAdmin(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminForm.email,
          password: adminForm.password,
          displayName: adminForm.displayName,
          role: adminForm.role,
        }),
      });
      const content = await response.json();
      if (!response.ok) {
        throw new Error(content?.error || "Impossible de créer le compte admin.");
      }

      setMessage(content.admin ? `Compte admin ajouté : ${content.admin.email}` : "Compte admin ajouté.");
      setAdminForm({ email: "", password: "", displayName: "", role: "admin" });
      const refreshed = await fetch("/api/admin/admins");
      const refreshedContent = await refreshed.json();
      if (refreshedContent?.admins) setAdmins(refreshedContent.admins);
    } catch (error) {
      setMessage(error.message || "Impossible de créer le compte admin.");
    } finally {
      setSavingAdmin(false);
    }
  }

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";
  const statusCounts = useMemo(() => ({
    all: users.length,
    active: users.filter((user) => (user.status || "pending") === "active").length,
    pending: users.filter((user) => (user.status || "pending") === "pending").length,
    unsubscribed: users.filter((user) => (user.status || "pending") === "unsubscribed").length,
    banned: users.filter((user) => (user.status || "pending") === "banned").length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesFilter = filter === "all" || (user.status || "pending") === filter;
      if (!matchesFilter) return false;
      if (!query) return true;
      const haystack = [
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        user.role,
        user.source_page,
        user.source_type,
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [users, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  if (!activeSession && authMode !== "disabled") {
    return <AdminLogin callbackUrl="/admin/utilisateurs" />;
  }

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">CRM</p>
            <h2>Utilisateurs et bénévoles</h2>
          </div>
          <span className="admin-section-hint">Base de communication et ciblage des campagnes</span>
        </div>

        <div className="admin-metrics compact-metrics">
          <div className="metric-card">
            <span>Total</span>
            <strong>{statusCounts.all}</strong>
            <small>Contacts</small>
          </div>
          <div className="metric-card">
            <span>Actifs</span>
            <strong>{statusCounts.active}</strong>
            <small>Qualifiés</small>
          </div>
          <div className="metric-card">
            <span>En attente</span>
            <strong>{statusCounts.pending}</strong>
            <small>À suivre</small>
          </div>
          <div className="metric-card">
            <span>Désabonnés</span>
            <strong>{statusCounts.unsubscribed}</strong>
            <small>À exclure</small>
          </div>
        </div>

        <form className="admin-add-form" onSubmit={handleCreateUser}>
          <h3>Ajouter un profil utilisateur ou bénévole</h3>
          <div className="form-row">
            <label>
              <span>Prénom</span>
              <input type="text" value={userForm.first_name} onChange={(event) => setUserForm((current) => ({ ...current, first_name: event.target.value }))} placeholder="Ex. Marie" />
            </label>
            <label>
              <span>Nom</span>
              <input type="text" value={userForm.last_name} onChange={(event) => setUserForm((current) => ({ ...current, last_name: event.target.value }))} placeholder="Ex. Ngoma" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" required value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} placeholder="prenom@exemple.com" />
            </label>
            <label>
              <span>Téléphone</span>
              <input type="tel" value={userForm.phone} onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))} placeholder="099 123 4567" />
            </label>
            <label>
              <span>Type</span>
              <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value, source_type: event.target.value, status: event.target.value === "volunteer" ? "active" : current.status }))}>
                <option value="volunteer">Bénévole</option>
                <option value="contact">Utilisateur</option>
                <option value="partnership">Partenariat</option>
                <option value="newsletter">Newsletter</option>
              </select>
            </label>
            <label>
              <span>Statut</span>
              <select value={userForm.status} onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">Actif</option>
                <option value="pending">En attente</option>
                <option value="unsubscribed">Désabonné</option>
                <option value="banned">Banni</option>
              </select>
            </label>
            <label className="wide-field">
              <span>Source</span>
              <input type="text" value={userForm.source_page} onChange={(event) => setUserForm((current) => ({ ...current, source_page: event.target.value }))} placeholder="admin-panel" />
            </label>
          </div>
          <div className="form-row">
            <label className="admin-check"><input type="checkbox" checked={userForm.consent_email} onChange={(event) => setUserForm((current) => ({ ...current, consent_email: event.target.checked }))} /> Consentement email</label>
            <label className="admin-check"><input type="checkbox" checked={userForm.consent_sms} onChange={(event) => setUserForm((current) => ({ ...current, consent_sms: event.target.checked }))} /> Consentement SMS</label>
            <label className="admin-check"><input type="checkbox" checked={userForm.consent_communication} onChange={(event) => setUserForm((current) => ({ ...current, consent_communication: event.target.checked }))} /> Communication</label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn" disabled={savingUser}>{savingUser ? "Ajout..." : "Ajouter"}</button>
          </div>
        </form>

        <div className="admin-toolbar modern-toolbar">
          <div className="toolbar-group">
            <label className="toolbar-label">Filtrer</label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Tous</option>
              {statusOrder.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>
          <div className="toolbar-group toolbar-search">
            <label className="toolbar-label">Recherche</label>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, email, téléphone..." />
          </div>
          <strong>{filteredUsers.length} utilisateur(s)</strong>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="empty-state-card">Aucun utilisateur pour ce filtre.</div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Source</th>
                    <th>Consentements</th>
                    <th>Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => {
                    const initials = `${user.first_name?.trim().charAt(0) || ""}${user.last_name?.trim().charAt(0) || ""}`.toUpperCase() || (user.email || "U").slice(0, 2).toUpperCase();
                    const userStatus = user.status || "pending";
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <span className="user-badge">{initials}</span>
                            <div>
                              <strong>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Contact"}</strong>
                              <small>{user.email}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="record-pill type">{user.role || "contact"}</span></td>
                        <td><span className={`record-pill status status-${userStatus}`}>{statusLabels[userStatus] || userStatus}</span></td>
                        <td>{user.source_page || user.source_type || "unknown"}</td>
                        <td>
                          <div className="consent-stack">
                            <span>{user.consent_email ? "Email ✓" : "Email –"}</span>
                            <span>{user.consent_sms ? "SMS ✓" : "SMS –"}</span>
                            <span>{user.consent_communication ? "Com. ✓" : "Com. –"}</span>
                          </div>
                        </td>
                        <td>{user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length > pageSize && (
              <div className="admin-pagination">
                <button type="button" className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Précédent</button>
                <span>Page {page} / {totalPages}</span>
                <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Suivant</button>
              </div>
            )}
          </>
        )}
      </section>

      {isSuperAdmin && (
        <section className="admin-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">Sécurité</p>
              <h2>Comptes administrateurs</h2>
            </div>
          </div>

          <form className="admin-add-form" onSubmit={handleCreateAdmin}>
            <h3>Ajouter un compte admin</h3>
            <div className="form-row">
              <label>
                <span>Email</span>
                <input type="email" required value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} placeholder="admin@exemple.com" />
              </label>
              <label>
                <span>Nom affiché</span>
                <input type="text" value={adminForm.displayName} onChange={(event) => setAdminForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Jean Dupont" />
              </label>
              <label>
                <span>Rôle</span>
                <select value={adminForm.role} onChange={(event) => setAdminForm((current) => ({ ...current, role: event.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super-admin</option>
                </select>
              </label>
              <label>
                <span>Mot de passe</span>
                <input type="password" required minLength={12} value={adminForm.password} onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))} placeholder="Minimum 12 caractères" />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={savingAdmin}>{savingAdmin ? "Création..." : "Créer le compte admin"}</button>
            </div>
          </form>

          {admins.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Nom</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.email}</td>
                      <td>{admin.display_name || "—"}</td>
                      <td>{admin.role}</td>
                      <td><span className={`record-pill status ${admin.is_active ? "status-active" : "status-pending"}`}>{admin.is_active ? "Actif" : "Inactif"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {message && <p role="status" className="admin-message">{message}</p>}
    </main>
  </AdminShell>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { session, authMode: process.env.ADMIN_AUTH_MODE || "credentials" } };
}
