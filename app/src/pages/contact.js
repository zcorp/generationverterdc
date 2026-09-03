import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import SocialLinks from "../components/SocialLinks";

const defaultSettings = {
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

export default function ContactPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [status, setStatus] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    consent: false,
  });

  useEffect(() => {
    fetch("/api/public-content")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.contact_page) {
          setSettings({ ...defaultSettings, ...content.settings.contact_page });
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    if (!formData.name.trim() || !formData.phone.trim()) {
      setStatus("Le nom et le numéro de téléphone sont obligatoires.");
      return;
    }

    const payload = {
      submissionType: "contact",
      sourcePage: "contact",
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subject: formData.subject,
      message: formData.message,
      consent: formData.consent,
      payload: {
        requestedSubject: formData.subject,
      },
    };

    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setStatus(error.error || "Enregistrement impossible.");
        return;
      }

      setStatus("Votre message a bien été enregistré. L'équipe GV-RDC pourra le retrouver dans l'historique administratif.");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "", consent: false });
    } catch {
      setStatus("Le serveur n'est pas disponible pour l'instant.");
    }
  }

  return <PageLayout heroClass="hero-join" eyebrow={settings.eyebrow} title={settings.title} copy={settings.copy}><section className="content-section contact-layout"><div><p className="eyebrow">Nous trouver</p><h2>{settings.locationTitle}</h2><p>{settings.locationDescription}</p><dl><dt>Adresse</dt><dd>{settings.address.split("\n").map((line, index) => <span key={line + index}>{line}<br /></span>)}</dd><dt>Email</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd><dt>Réseaux</dt><dd><SocialLinks /></dd></dl></div><form className="contact-form" onSubmit={handleSubmit}><p className="eyebrow">{settings.formTitle}</p><label>Nom complet<input required type="text" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></label><label>Email<input required type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></label><label>Téléphone<input type="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></label><label>Objet<select value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })}><option value="" disabled>Choisir un sujet</option><option>Question générale</option><option>Projet scolaire</option><option>Partenariat</option><option>Médias</option></select></label><label>Message<textarea required rows="4" value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} /></label><label className="consent-label"><input required type="checkbox" checked={formData.consent} onChange={(event) => setFormData({ ...formData, consent: event.target.checked })} /> J'accepte que GV-RDC utilise ces informations pour répondre à mon message.</label><button className="btn btn-yellow" type="submit">Envoyer le message</button>{status && <p className="form-note">{status}</p>}</form></section><section className="strip"><h2>{settings.quickContactTitle}</h2><p>{settings.quickContactText}</p></section></PageLayout>;
}
