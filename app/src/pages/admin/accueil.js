import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";
import { defaultHomeSettings } from "../../data/publicContent";

export default function AdminHomePage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [settings, setSettings] = useState(defaultHomeSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/site-settings?key=home_page")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.home_page) {
          setSettings({ ...defaultHomeSettings, ...content.settings.home_page });
        }
      })
      .catch(() => setMessage("Impossible de charger la configuration de l'accueil."));
  }, [activeSession, authMode]);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "home_page", content: settings }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setMessage(error.error || "Enregistrement impossible.");
        return;
      }

      setMessage("Configuration enregistrée.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/accueil" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Accueil</h2>
          </div>
          <span className="admin-section-hint">Bannière, aperçu des piliers et bloc "Rejoignez-nous"</span>
        </div>

        <div className="admin-add-form">
          <h3>Bannière principale</h3>
          <div className="form-row">
            <label className="wide-field">Titre<input value={settings.heroTitle} onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description<textarea rows="2" value={settings.heroCopy} onChange={(e) => setSettings({ ...settings, heroCopy: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Bouton principal<input value={settings.heroPrimaryCta} onChange={(e) => setSettings({ ...settings, heroPrimaryCta: e.target.value })} /></label>
            <label>Bouton secondaire<input value={settings.heroSecondaryCta} onChange={(e) => setSettings({ ...settings, heroSecondaryCta: e.target.value })} /></label>
          </div>
        </div>

        <div className="admin-add-form">
          <h3>Section piliers d'action</h3>
          <div className="form-row">
            <label>Titre<input value={settings.pillarsTitle} onChange={(e) => setSettings({ ...settings, pillarsTitle: e.target.value })} /></label>
            <label>Sous-titre<input value={settings.pillarsLead} onChange={(e) => setSettings({ ...settings, pillarsLead: e.target.value })} /></label>
          </div>
          <p className="admin-section-hint">Le contenu des trois cartes se modifie dans "Nos piliers d'action".</p>
        </div>

        <div className="admin-add-form">
          <h3>Section impact</h3>
          <div className="form-row">
            <label>Titre<input value={settings.impactTitle} onChange={(e) => setSettings({ ...settings, impactTitle: e.target.value })} /></label>
          </div>
          <p className="admin-section-hint">Les chiffres se modifient dans "Indicateurs d'impact".</p>
        </div>

        <div className="admin-add-form">
          <h3>Bandeau "Rejoignez-nous"</h3>
          <div className="form-row">
            <label>Titre<input value={settings.joinTitle} onChange={(e) => setSettings({ ...settings, joinTitle: e.target.value })} /></label>
            <label>Bouton<input value={settings.joinCta} onChange={(e) => setSettings({ ...settings, joinCta: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description<textarea rows="2" value={settings.joinCopy} onChange={(e) => setSettings({ ...settings, joinCopy: e.target.value })} /></label>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-yellow" type="button" onClick={saveSettings} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
        </div>
      </section>

      {message && <p role="status" className="admin-message">{message}</p>}
    </main>
  </AdminShell>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { session, authMode: process.env.ADMIN_AUTH_MODE || "credentials" } };
}
