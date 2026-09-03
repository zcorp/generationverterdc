import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

const emptyForm = {
  name: "",
  subject: "",
  body: "",
  role: "all",
  status: "all",
  onlyConsent: true,
  channel: "email",
};

export default function AdminCampaignsPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [preview, setPreview] = useState({ total: 0, recipients: [] });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const pageSize = 8;

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    Promise.all([
      fetch("/api/admin/users").then((response) => response.ok ? response.json() : { users: [] }),
      fetch("/api/admin/campaigns").then((response) => response.ok ? response.json() : { campaigns: [], deliveries: [] }),
    ])
      .then(([usersResponse, campaignResponse]) => {
        setUsers(usersResponse.users || []);
        setCampaigns(campaignResponse.campaigns || []);
      })
      .catch(() => setMessage("Impossible de charger la base de destinataires."));
  }, [activeSession, authMode]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const validRecipients = users.filter((user) => {
    const roleOk = form.role === "all" || (user.role || "contact") === form.role;
    const statusOk = form.status === "all" || (user.status || "pending") === form.status;
    const consentOk = !form.onlyConsent || (form.channel === "email"
      ? Boolean(user.consent_email || user.consent_communication)
      : form.channel === "sms" || form.channel === "whatsapp"
        ? Boolean(user.consent_sms || user.consent_communication)
        : Boolean(user.consent_email || user.consent_sms || user.consent_communication));
    const hasChannelContact = form.channel === "sms" || form.channel === "whatsapp"
      ? Boolean(user.phone)
      : form.channel === "both"
        ? Boolean(user.email || user.phone)
        : Boolean(user.email);
    return roleOk && statusOk && consentOk && hasChannelContact;
  });

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (!query) return true;
      const haystack = [campaign.name, campaign.subject, campaign.channel, campaign.body].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [campaigns, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const pagedCampaigns = filteredCampaigns.slice((page - 1) * pageSize, page * pageSize);
  const totalRecipients = campaigns.reduce((sum, campaign) => sum + Number(campaign.recipients_count || 0), 0);

  async function handlePreview() {
    const payload = {
      name: form.name,
      subject: form.subject,
      body: form.body,
      channel: form.channel,
      filters: {
        role: form.role,
        status: form.status,
        onlyConsent: form.onlyConsent,
      },
      dryRun: true,
    };

    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Aperçu impossible.");
      return;
    }

    setPreview(result.preview || { total: 0, recipients: [] });
    setMessage(`Aperçu : ${result.preview?.total || 0} destinataire(s) éligibles.`);
  }

  async function handleSend() {
    if (!form.name || !form.subject || !form.body) {
      setMessage("Saisissez le nom, l’objet et le message de la campagne.");
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        subject: form.subject,
        body: form.body,
        channel: form.channel,
        filters: {
          role: form.role,
          status: form.status,
          onlyConsent: form.onlyConsent,
        },
      }),
    });

    const result = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setMessage(result.error || "L’envoi de la campagne a échoué.");
      return;
    }

    setCampaigns((current) => [result.campaign, ...current]);
    setForm(emptyForm);
    setMessage(`Campagne envoyée à ${result.campaign?.recipients_count || 0} destinataire(s).`);
  }

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";

  if (!activeSession && authMode !== "disabled") {
    return <AdminLogin callbackUrl="/admin/campagnes" />;
  }

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">CRM & communication</p>
            <h2>Campagnes ciblées</h2>
          </div>
          <span className="admin-section-hint">Ciblage selon rôle, statut et consentement</span>
        </div>

        <div className="admin-metrics compact-metrics">
          <div className="metric-card">
            <span>Campagnes</span>
            <strong>{campaigns.length}</strong>
            <small>Envoyées</small>
          </div>
          <div className="metric-card">
            <span>Destinataires</span>
            <strong>{totalRecipients}</strong>
            <small>Contacts touchés</small>
          </div>
          <div className="metric-card">
            <span>Éligibles</span>
            <strong>{validRecipients.length}</strong>
            <small>Pour la cible</small>
          </div>
        </div>

        <div className="admin-compose-grid">
          <div className="admin-add-form admin-composer-panel">
            <h3>Créer une campagne</h3>
            <div className="form-row">
              <label>Nom de la campagne
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex. Appel aux bénévoles - juillet" />
              </label>
            </div>

            <div className="form-row">
              <label>Objet du message
                <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Ex. Rejoignez GV-RDC pour la prochaine saison" />
              </label>
            </div>

            <div className="form-row">
              <label>Rôle cible
                <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  <option value="all">Tous</option>
                  <option value="volunteer">Bénévoles</option>
                  <option value="partnership">Partenaires</option>
                  <option value="contact">Contacts</option>
                </select>
              </label>

              <label>Statut cible
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="pending">En attente</option>
                  <option value="unsubscribed">Désabonnés</option>
                </select>
              </label>

              <label>Canal d’envoi
                <select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="both">Email + WhatsApp</option>
                </select>
              </label>

              <label className="admin-check">
                <input type="checkbox" checked={form.onlyConsent} onChange={(event) => setForm((current) => ({ ...current, onlyConsent: event.target.checked }))} />
                N’envoyer qu’aux contacts consentants
              </label>
            </div>

            <div className="form-row">
              <label className="wide-field">Contenu du message
                <textarea rows="8" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder="Bonjour, ..." />
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handlePreview}>Prévisualiser</button>
              <button type="button" className="btn btn-yellow" onClick={handleSend} disabled={saving}>
                {saving ? "Envoi..." : "Envoyer la campagne"}
              </button>
            </div>

            <div className="admin-message-box">
              <strong>{validRecipients.length}</strong> destinataire(s) éligibles selon le ciblage actuel.
            </div>

            {preview.total > 0 && (
              <div className="admin-preview-panel">
                <h3>Prévisualisation</h3>
                <p>{preview.total} destinataire(s) sélectionné(s) pour le canal <strong>{preview.channel || form.channel}</strong>.</p>
                <ul>
                  {preview.recipients.slice(0, 10).map((recipient) => (
                    <li key={recipient.email || recipient.phone || recipient.userId}>{recipient.first_name || recipient.name || "Destinataire"} — {recipient.email || recipient.phone || "WhatsApp"}{recipient.whatsappLink ? ` — ${recipient.whatsappLink}` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="admin-side-panel">
            <div className="mini-panel">
              <h3>Résumé cible</h3>
              <div className="mini-metric-list">
                <div><span>Rôle</span><strong>{form.role === "all" ? "Tous" : form.role}</strong></div>
                <div><span>Statut</span><strong>{form.status === "all" ? "Tous" : form.status}</strong></div>
                <div><span>Canal</span><strong>{form.channel}</strong></div>
                <div><span>Consentement</span><strong>{form.onlyConsent ? "Oui" : "Non"}</strong></div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Campagnes envoyées</h2>
          </div>
          <div className="toolbar-group toolbar-search compact-search">
            <label className="toolbar-label">Recherche</label>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, sujet, canal..." />
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="empty-state-card">Aucune campagne pour cette recherche.</div>
        ) : (
          <>
            <div className="admin-record-grid compact-grid">
              {pagedCampaigns.map((campaign) => (
                <article key={campaign.id} className="admin-record-card mini-card">
                  <div className="admin-record-head">
                    <div className="admin-record-tags">
                      <span className="record-pill type">{campaign.channel || "email"}</span>
                      <span className="record-pill status status-active">{campaign.status || "envoyée"}</span>
                    </div>
                    <small>{new Date(campaign.created_at).toLocaleDateString("fr-FR")}</small>
                  </div>

                  <div className="admin-record-main">
                    <div className="record-person">
                      <h3>{campaign.name}</h3>
                      <p>{campaign.subject}</p>
                    </div>
                  </div>

                  <div className="record-meta-box">
                    <strong>{campaign.recipients_count || 0}</strong> destinataire(s)
                  </div>

                  <p className="campaign-preview-text">{campaign.body?.slice(0, 180)}{campaign.body && campaign.body.length > 180 ? "..." : ""}</p>
                </article>
              ))}
            </div>

            {filteredCampaigns.length > pageSize && (
              <div className="admin-pagination">
                <button type="button" className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Précédent</button>
                <span>Page {page} / {totalPages}</span>
                <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Suivant</button>
              </div>
            )}
          </>
        )}
      </section>

      {message && <p role="status" className="admin-message">{message}</p>}
    </main>
  </AdminShell>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { session, authMode: process.env.ADMIN_AUTH_MODE || "credentials" } };
}
