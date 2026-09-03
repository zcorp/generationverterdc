import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

const defaultContactSettings = {
  eyebrow: "Échanger avec GV-RDC",
  title: "Contact",
  copy: "Une question, une idée ou une envie de construire un projet ensemble ? Notre équipe vous répond.",
  locationTitle: "Parlons de votre projet",
  locationDescription: "Génération Verte RDC agit depuis Kisangani, dans la province de la Tshopo. Nous sommes disponibles pour échanger avec les écoles, associations, collectivités et partenaires.",
  address: "Av. Kitima, Bâtiment Civil ITP\nRéf. Faculté des Sciences UNIKIS, C. Makiso\nVille de Kisangani, P. Tshopo RDC",
  email: "contact@generationverte-rdc.fr",
  socials: "Facebook · YouTube · TikTok · WhatsApp",
  formTitle: "Écrire à l'équipe",
  formNote: "La soumission sera reliée à l'adresse de contact validée par l'association.",
  quickContactTitle: "Vous préférez parler ?",
  quickContactText: "Pour un contact rapide, laissez votre numéro ou choisissez l'appel/WhatsApp sur la page Rejoignez-nous."
};

export default function AdminContactPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [settings, setSettings] = useState(defaultContactSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/site-settings?key=contact_page")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.contact_page) {
          setSettings({ ...defaultContactSettings, ...content.settings.contact_page });
        }
      })
      .catch(() => setMessage("Impossible de charger la configuration de la page Contact."));
  }, [activeSession, authMode]);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "contact_page", content: settings }),
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

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/contact" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Contact</h2>
          </div>
          <span className="admin-section-hint">Coordonnées, texte d’accueil et contact rapide</span>
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
            <label>Titre de section<input value={settings.locationTitle} onChange={(e) => setSettings({ ...settings, locationTitle: e.target.value })} /></label>
            <label>Réseaux<input value={settings.socials} onChange={(e) => setSettings({ ...settings, socials: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description de section<textarea rows="3" value={settings.locationDescription} onChange={(e) => setSettings({ ...settings, locationDescription: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Adresse<textarea rows="2" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label>
            <label>Email<input value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Formulaire titre<input value={settings.formTitle} onChange={(e) => setSettings({ ...settings, formTitle: e.target.value })} /></label>
            <label>Note formulaire<input value={settings.formNote} onChange={(e) => setSettings({ ...settings, formNote: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label>Titre contact rapide<input value={settings.quickContactTitle} onChange={(e) => setSettings({ ...settings, quickContactTitle: e.target.value })} /></label>
            <label>Texte contact rapide<input value={settings.quickContactText} onChange={(e) => setSettings({ ...settings, quickContactText: e.target.value })} /></label>
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
