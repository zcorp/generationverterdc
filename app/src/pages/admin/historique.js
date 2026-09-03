import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

const submissionLabels = {
  volunteer: "Candidature bénévole",
  partnership: "Demande partenariats",
  contact: "Message de contact",
  newsletter: "Newsletter",
};

const statusLabels = {
  new: "Nouvelle",
  in_progress: "En cours",
  responded: "Réponse envoyée",
  closed: "Clôturée",
};

const statusOrder = ["new", "in_progress", "responded", "closed"];

const responseTemplates = {
  volunteer: {
    subject: "Votre candidature au programme GV-RDC",
    body: "Bonjour {name},\n\nMerci pour votre intérêt pour le programme GV-RDC et pour le temps que vous avez consacré à votre candidature. Nous avons bien reçu votre demande et l’équipe la examine avec attention.\n\nNous reviendrons vers vous prochainement avec une réponse ou une demande d’information complémentaire.\n\nMerci pour votre engagement et votre disponibilité.\n\nCordialement,\nL’équipe GV-RDC",
  },
  partnership: {
    subject: "Votre demande de partenariat GV-RDC",
    body: "Bonjour {name},\n\nMerci pour votre message concernant une collaboration avec GV-RDC. Nous avons bien reçu votre demande et l’équipe dédiée la examine avec attention.\n\nNous vous répondrons dans les meilleurs délais afin d’échanger sur les modalités de partenariat et les prochaines étapes possibles.\n\nMerci pour votre intérêt et votre soutien à la mission de GV-RDC.\n\nCordialement,\nL’équipe GV-RDC",
  },
  contact: {
    subject: "Réponse à votre message",
    body: "Bonjour {name},\n\nMerci pour votre message. Nous avons bien reçu votre demande et l’équipe GV-RDC y répondra dans les meilleurs délais.\n\nNous vous remercions pour votre intérêt et votre confiance.\n\nCordialement,\nL’équipe GV-RDC",
  },
  newsletter: {
    subject: "Merci pour votre intérêt GV-RDC",
    body: "Bonjour {name},\n\nMerci pour votre intérêt pour la newsletter GV-RDC. Nous vous tiendrons informé des actualités et des initiatives de la plateforme.\n\nNous vous remercions pour votre engagement.\n\nCordialement,\nL’équipe GV-RDC",
  },
};

function buildResponseTemplate(submission) {
  const template = responseTemplates[submission?.submission_type] || responseTemplates.contact;
  const recipientName = submission?.name?.trim() || "Madame, Monsieur";
  const filledBody = template.body.replace("{name}", recipientName);
  return {
    subject: template.subject,
    body: filledBody,
  };
}

export default function AdminHistoryPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const pageSize = 12;

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/submissions")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.submissions) {
          setSubmissions(content.submissions);
        }
      })
      .catch(() => setMessage("Impossible de charger l'historique des demandes."));
  }, [activeSession, authMode]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";

  const statusCounts = useMemo(() => ({
    all: submissions.length,
    new: submissions.filter((submission) => submission.status === "new").length,
    in_progress: submissions.filter((submission) => submission.status === "in_progress").length,
    responded: submissions.filter((submission) => submission.status === "responded").length,
    closed: submissions.filter((submission) => submission.status === "closed").length,
  }), [submissions]);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesFilter = filter === "all" || submission.status === filter;
      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [
        submission.name,
        submission.email,
        submission.phone,
        submission.source_page,
        submission.subject,
        submission.message,
        submission.submission_type,
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [submissions, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const pagedSubmissions = filteredSubmissions.slice((page - 1) * pageSize, page * pageSize);

  async function updateSubmission(submissionId, nextStatus, replyText, sendMail = false) {
    setSavingId(submissionId);
    setMessage("");

    try {
      const submission = submissions.find((item) => item.id === submissionId) || {};
      const response = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submissionId,
          status: nextStatus,
          adminReply: replyText,
          reviewedBy: adminEmail,
          sendMail,
          email: submission.email,
          name: submission.name,
          submissionType: submission.submission_type,
          recipientEmail: submission.email,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Mise à jour impossible.");
        return;
      }

      setSubmissions((current) => current.map((item) => item.id === submissionId ? result.submission : item));
      if (sendMail && result.email?.ok) {
        setMessage("Réponse enregistrée et email envoyé avec succès.");
      } else if (sendMail && !result.email?.ok) {
        setMessage("Réponse enregistrée, mais l’envoi email est désactivé ou non configuré sur ce serveur.");
      } else {
        setMessage("Demande mise à jour avec succès.");
      }
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setSavingId(null);
    }
  }

  function patchDraft(submissionId, field, value) {
    setSubmissions((current) => current.map((item) => item.id === submissionId ? { ...item, [field]: value } : item));
  }

  function toggleExpanded(submissionId) {
    setExpandedId((current) => current === submissionId ? null : submissionId);
  }

  function applySuggestedReply(submission) {
    const draft = buildResponseTemplate(submission);
    patchDraft(submission.id, "status", "in_progress");
    patchDraft(submission.id, "admin_reply", draft.body);
    setExpandedId(submission.id);
    setMessage("Réponse type ajoutée au brouillon.");
  }

  async function copyReply(submission) {
    const content = submission.admin_reply || buildResponseTemplate(submission).body;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        setMessage("Réponse copiée dans le presse-papiers.");
        return;
      }
      setMessage("Copie impossible dans ce navigateur. Vous pouvez recopier le texte manuellement.");
    } catch {
      setMessage("La copie a échoué. Vous pouvez recopier le texte manuellement.");
    }
  }

  function openReplyByEmail(submission) {
    const draft = buildResponseTemplate(submission);
    const recipient = submission.email || "contact@gv-rdc.org";
    const subject = encodeURIComponent(draft.subject);
    const body = encodeURIComponent(draft.body);
    const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  }

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/historique" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Candidatures et demandes</h2>
          </div>
          <span className="admin-section-hint">Suivi des demandes depuis les formulaires publics</span>
        </div>

        <div className="admin-metrics">
          <div className="metric-card">
            <span>Total</span>
            <strong>{statusCounts.all}</strong>
            <small>Demandes</small>
          </div>
          <div className="metric-card">
            <span>Nouvelles</span>
            <strong>{statusCounts.new}</strong>
            <small>À traiter</small>
          </div>
          <div className="metric-card">
            <span>En cours</span>
            <strong>{statusCounts.in_progress}</strong>
            <small>Suivies</small>
          </div>
          <div className="metric-card">
            <span>Réponses</span>
            <strong>{statusCounts.responded + statusCounts.closed}</strong>
            <small>Traitées</small>
          </div>
        </div>

        <div className="admin-toolbar modern-toolbar">
          <div className="toolbar-group">
            <label className="toolbar-label">Filtrer</label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Toutes</option>
              {statusOrder.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>
          <div className="toolbar-group toolbar-search">
            <label className="toolbar-label">Recherche</label>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, email, page..." />
          </div>
          <strong>{filteredSubmissions.length} demande(s)</strong>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="empty-state-card">Aucune demande enregistrée pour ce filtre.</div>
        ) : (
          <>
            <div className="admin-record-list">
              {pagedSubmissions.map((submission) => {
                const isOpen = expandedId === submission.id;
                const preview = (submission.subject || submission.message || "").trim();

                return (
                  <article key={submission.id} className={`admin-record-row ${isOpen ? "is-open" : ""}`}>
                    <div
                      className="admin-record-summary"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => toggleExpanded(submission.id)}
                      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), toggleExpanded(submission.id))}
                    >
                      <div className="admin-record-tags">
                        <span className="record-pill type">{submissionLabels[submission.submission_type] || submission.submission_type}</span>
                        <span className={`record-pill status status-${submission.status || "new"}`}>{statusLabels[submission.status] || "Nouvelle"}</span>
                      </div>
                      <div className="record-person record-person-compact">
                        <strong>{submission.name || "Demande sans nom"}</strong>
                        {preview && <span className="record-preview-text">{preview}</span>}
                      </div>
                      <small className="record-date">{new Date(submission.created_at).toLocaleDateString("fr-FR")}</small>
                      <span className="admin-record-chevron" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
                    </div>

                    {isOpen && (
                      <div className="admin-record-details">
                        <div className="admin-record-main">
                          <div className="record-person">
                            <p>{submission.source_page || "Page inconnue"}</p>
                          </div>
                          <div className="record-contact-list">
                            {submission.email && <span>{submission.email}</span>}
                            {submission.phone && <span>{submission.phone}</span>}
                          </div>
                        </div>

                        <div className="record-message-block">
                          {submission.subject && <p><strong>Objet :</strong> {submission.subject}</p>}
                          {submission.message && <p>{submission.message}</p>}
                        </div>

                        {submission.payload && Object.keys(submission.payload || {}).length > 0 && (
                          <div className="record-meta-box">
                            <strong>Données complémentaires</strong>
                            <pre>{JSON.stringify(submission.payload, null, 2)}</pre>
                          </div>
                        )}

                        <div className="response-panel">
                          <div className="inline-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => applySuggestedReply(submission)}>Réponse type</button>
                            <button type="button" className="btn btn-secondary" onClick={() => copyReply(submission)}>Copier</button>
                            {submission.email && (
                              <button type="button" className="btn btn-yellow" onClick={() => openReplyByEmail(submission)}>Email</button>
                            )}
                          </div>

                          <label>
                            Statut
                            <select value={submission.status || "new"} onChange={(event) => patchDraft(submission.id, "status", event.target.value)}>
                              {statusOrder.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                            </select>
                          </label>

                          <label>
                            Réponse proposée / note interne
                            <textarea rows="4" value={submission.admin_reply || ""} onChange={(event) => patchDraft(submission.id, "admin_reply", event.target.value)} placeholder="Saisissez un message de réponse ou une note interne à transmettre à l’équipe." />
                          </label>

                          <div className="form-actions small-actions">
                            <button type="button" className="btn btn-yellow" disabled={savingId === submission.id} onClick={() => updateSubmission(submission.id, submission.status || "new", submission.admin_reply || "", false)}>
                              {savingId === submission.id ? "Enregistrement..." : "Enregistrer"}
                            </button>
                            {submission.email && (
                              <button type="button" className="btn btn-secondary" disabled={savingId === submission.id} onClick={() => updateSubmission(submission.id, "responded", submission.admin_reply || buildResponseTemplate(submission).body, true)}>
                                Envoyer par email
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {filteredSubmissions.length > pageSize && (
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
