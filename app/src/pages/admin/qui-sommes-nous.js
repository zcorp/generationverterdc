import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";
import { defaultAboutSettings } from "../../data/publicContent";

export default function AdminAboutPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [settings, setSettings] = useState(defaultAboutSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/site-settings?key=about_page")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.about_page) {
          setSettings({ ...defaultAboutSettings, ...content.settings.about_page });
        }
      })
      .catch(() => setMessage("Impossible de charger la configuration de la page."));
  }, [activeSession, authMode]);

  function updateFact(index, field, value) {
    const facts = [...(settings.facts || defaultAboutSettings.facts)];
    facts[index] = { ...facts[index], [field]: value };
    setSettings({ ...settings, facts });
  }

  function updateValue(index, field, value) {
    const values = [...(settings.values || defaultAboutSettings.values)];
    values[index] = { ...values[index], [field]: value };
    setSettings({ ...settings, values });
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "about_page", content: settings }),
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
  const facts = settings.facts || defaultAboutSettings.facts;
  const values = settings.values || defaultAboutSettings.values;

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/qui-sommes-nous" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Qui sommes-nous</h2>
          </div>
          <span className="admin-section-hint">Mission, vision, valeurs et gouvernance</span>
        </div>

        <div className="admin-add-form">
          <h3>En-tête de page</h3>
          <div className="form-row">
            <label>Eyebrow<input value={settings.heroEyebrow} onChange={(e) => setSettings({ ...settings, heroEyebrow: e.target.value })} /></label>
            <label>Titre<input value={settings.heroTitle} onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })} /></label>
          </div>
          <div className="form-row">
            <label className="wide-field">Description<textarea rows="2" value={settings.heroCopy} onChange={(e) => setSettings({ ...settings, heroCopy: e.target.value })} /></label>
          </div>
        </div>

        <div className="admin-add-form">
          <h3>Mission</h3>
          <div className="form-row">
            <label>Eyebrow<input value={settings.missionEyebrow} onChange={(e) => setSettings({ ...settings, missionEyebrow: e.target.value })} /></label>
            <label>Titre<input value={settings.missionTitle} onChange={(e) => setSettings({ ...settings, missionTitle: e.target.value })} /></label>
          </div>
          <div className="form-row"><label className="wide-field">Paragraphe 1<textarea rows="2" value={settings.missionParagraph1} onChange={(e) => setSettings({ ...settings, missionParagraph1: e.target.value })} /></label></div>
          <div className="form-row"><label className="wide-field">Paragraphe 2<textarea rows="2" value={settings.missionParagraph2} onChange={(e) => setSettings({ ...settings, missionParagraph2: e.target.value })} /></label></div>
          <div className="form-row"><label className="wide-field">Paragraphe 3<textarea rows="2" value={settings.missionParagraph3} onChange={(e) => setSettings({ ...settings, missionParagraph3: e.target.value })} /></label></div>
          <div className="form-row">
            <label className="wide-field">Citation<textarea rows="2" value={settings.quote} onChange={(e) => setSettings({ ...settings, quote: e.target.value })} /></label>
          </div>
          <div className="form-row"><label>Légende de la citation<input value={settings.quoteCaption} onChange={(e) => setSettings({ ...settings, quoteCaption: e.target.value })} /></label></div>
        </div>

        <div className="admin-add-form">
          <h3>Vision</h3>
          <div className="form-row">
            <label>Eyebrow<input value={settings.visionEyebrow} onChange={(e) => setSettings({ ...settings, visionEyebrow: e.target.value })} /></label>
            <label>Titre<input value={settings.visionTitle} onChange={(e) => setSettings({ ...settings, visionTitle: e.target.value })} /></label>
          </div>
          <div className="form-row"><label className="wide-field">Description<textarea rows="2" value={settings.visionCopy} onChange={(e) => setSettings({ ...settings, visionCopy: e.target.value })} /></label></div>
          <h4>Repères clés</h4>
          {facts.map((fact, index) => (
            <div className="form-row" key={`fact-${index}`}>
              <label>Titre<input value={fact.title} onChange={(e) => updateFact(index, "title", e.target.value)} /></label>
              <label className="wide-field">Description<input value={fact.copy} onChange={(e) => updateFact(index, "copy", e.target.value)} /></label>
            </div>
          ))}
        </div>

        <div className="admin-add-form">
          <h3>Nos valeurs</h3>
          <div className="form-row">
            <label>Eyebrow<input value={settings.valuesEyebrow} onChange={(e) => setSettings({ ...settings, valuesEyebrow: e.target.value })} /></label>
            <label>Titre<input value={settings.valuesTitle} onChange={(e) => setSettings({ ...settings, valuesTitle: e.target.value })} /></label>
          </div>
          {values.map((value, index) => (
            <div className="form-row" key={`value-${index}`}>
              <label>Valeur {index + 1}<input value={value.title} onChange={(e) => updateValue(index, "title", e.target.value)} /></label>
              <label className="wide-field">Description<input value={value.copy} onChange={(e) => updateValue(index, "copy", e.target.value)} /></label>
            </div>
          ))}
        </div>

        <div className="admin-add-form">
          <h3>Gouvernance</h3>
          <div className="form-row">
            <label>Eyebrow<input value={settings.governanceEyebrow} onChange={(e) => setSettings({ ...settings, governanceEyebrow: e.target.value })} /></label>
            <label>Titre<input value={settings.governanceTitle} onChange={(e) => setSettings({ ...settings, governanceTitle: e.target.value })} /></label>
          </div>
          <div className="form-row"><label className="wide-field">Description<textarea rows="2" value={settings.governanceCopy} onChange={(e) => setSettings({ ...settings, governanceCopy: e.target.value })} /></label></div>
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
