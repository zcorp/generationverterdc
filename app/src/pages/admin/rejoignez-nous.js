import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

const defaultJoinSettings = {
  eyebrow: "Agir avec GV-RDC",
  title: "Rejoignez-nous",
  copy: "Participez aux actions de Génération Verte RDC auprès des jeunes de la Tshopo.",
  volunteerTitle: "Devenir bénévole ou animateur",
  volunteerDescription: "Rejoignez les équipes qui animent les ateliers et les clubs environnementaux dans les écoles de Kisangani.",
  partnerTitle: "Espace partenariats & donateurs",
  partnerDescription: "Nous construisons des partenariats adaptés aux écoles, associations, collectivités et bailleurs de fonds.",
  donationText: "Choisissez un montant, puis poursuivez votre don sur la plateforme sécurisée de notre partenaire.",
  donationUrl: "",
  newsletterTitle: "Restez informés",
  newsletterConsent: "J'accepte de recevoir des actualités par email, SMS et WhatsApp de la part de GV-RDC."
};

export default function AdminJoinPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [settings, setSettings] = useState(defaultJoinSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/site-settings?key=join_page")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.join_page) {
          setSettings({ ...defaultJoinSettings, ...content.settings.join_page });
        }
      })
      .catch(() => setMessage("Impossible de charger la configuration de la page Rejoignez-nous."));
  }, [activeSession, authMode]);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "join_page", content: settings }),
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

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/rejoignez-nous" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Rejoignez-nous</h2>
          </div>
          <span className="admin-section-hint">Texte d’accueil, formulaire et support</span>
        </div>

        <div className="admin-add-form">
          <h3>Modifier le contenu visible</h3>
          <div className="form-row">
            <label>Eyebrow<input value={settings.eyebrow} onChange={(e) => setSettings({ ...settings, eyebrow: e.target.value })} /></label>
            <label>Titre<input value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description<textarea rows="3" value={settings.copy} onChange={(e) => setSettings({ ...settings, copy: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Titre bénévole<input value={settings.volunteerTitle} onChange={(e) => setSettings({ ...settings, volunteerTitle: e.target.value })} /></label>
            <label>Titre partenariat<input value={settings.partnerTitle} onChange={(e) => setSettings({ ...settings, partnerTitle: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description bénévole<textarea rows="2" value={settings.volunteerDescription} onChange={(e) => setSettings({ ...settings, volunteerDescription: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description partenariat<textarea rows="2" value={settings.partnerDescription} onChange={(e) => setSettings({ ...settings, partnerDescription: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Texte don<textarea rows="2" value={settings.donationText} onChange={(e) => setSettings({ ...settings, donationText: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">URL de la plateforme de dons<input type="url" value={settings.donationUrl} onChange={(e) => setSettings({ ...settings, donationUrl: e.target.value })} placeholder="https://plateforme-de-dons.example/..." /></label>
          </div>
          <div className="form-row">
            <label>Titre newsletter<input value={settings.newsletterTitle} onChange={(e) => setSettings({ ...settings, newsletterTitle: e.target.value })} /></label>
            <label>Consentement newsletter<input value={settings.newsletterConsent} onChange={(e) => setSettings({ ...settings, newsletterConsent: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-yellow" type="button" onClick={saveSettings} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
          </div>
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
