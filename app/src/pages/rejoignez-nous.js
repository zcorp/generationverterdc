import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";

const defaultSettings = {
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

function ContactForm({ partner = false, settings }) {
  const [status, setStatus] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    channel: "",
    consent: false,
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    if (!formData.name.trim() || !formData.phone.trim()) {
      setStatus("Le nom et le numéro de téléphone sont obligatoires.");
      return;
    }

    const payload = {
      submissionType: partner ? "partnership" : "volunteer",
      sourcePage: "rejoignez-nous",
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      channel: formData.channel,
      consent: partner ? formData.consent : true,
      payload: {
        partner,
        requestedChannel: formData.channel,
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

      setStatus("Votre demande a bien été enregistrée. L'équipe GV-RDC pourra la retrouver dans l'historique d'administration.");
      setFormData({ name: "", email: "", phone: "", channel: "", consent: false });
    } catch {
      setStatus("Le serveur n'est pas disponible pour l'instant.");
    }
  }

  return <form className="join-card" onSubmit={handleSubmit}><div className="point-icon">{partner ? "◆" : "★"}</div><h2>{partner ? settings.partnerTitle : settings.volunteerTitle}</h2><p>{partner ? settings.partnerDescription : settings.volunteerDescription}</p><label>{partner ? "Nom de la structure *" : "Nom complet *"}<input required name="name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></label><label>Email<input required type="email" name="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></label><label>Téléphone *<input required type="tel" name="phone" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></label><label>{partner ? "Type de soutien envisagé" : "Canal de contact préféré"}<select required name="channel" value={formData.channel} onChange={(event) => setFormData({ ...formData, channel: event.target.value })}><option value="" disabled>Choisir une option</option>{partner ? <><option>Partenariat</option><option>Don financier</option><option>Don en nature</option><option>Appui matériel</option></> : <><option>Email</option><option>Appel téléphonique</option><option>WhatsApp</option></>}</select></label>{partner && <label className="consent-label"><input required type="checkbox" checked={formData.consent} onChange={(event) => setFormData({ ...formData, consent: event.target.checked })} /> J'accepte que GV-RDC utilise ces informations pour répondre à ma demande.</label>}<button className="btn btn-yellow" type="submit">{partner ? "Nous contacter" : "Envoyer ma candidature"}</button>{status && <p className="form-note">{status}</p>}</form>;
}

export default function JoinPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [donationAmount, setDonationAmount] = useState("25");
  const [donationStatus, setDonationStatus] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterData, setNewsletterData] = useState({ email: "", consent: false });

  useEffect(() => {
    fetch("/api/public-content")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.join_page) {
          setSettings({ ...defaultSettings, ...content.settings.join_page });
        }
      })
      .catch(() => undefined);
  }, []);

  function continueToDonation() {
    setDonationStatus("");
    if (!settings.donationUrl) {
      setDonationStatus("La plateforme de dons sera bientôt configurée.");
      return;
    }

    try {
      const donationUrl = new URL(settings.donationUrl);
      if (!/^https?:$/.test(donationUrl.protocol)) throw new Error("Unsupported protocol");
      donationUrl.searchParams.set("amount", donationAmount);
      window.location.href = donationUrl.toString();
    } catch {
      setDonationStatus("La plateforme de dons n'est pas correctement configurée.");
    }
  }

  async function handleNewsletterSubmit(event) {
    event.preventDefault();
    setNewsletterStatus("");

    if (!newsletterData.consent) {
      setNewsletterStatus("Votre consentement est nécessaire pour recevoir nos actualités.");
      return;
    }

    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionType: "newsletter",
          sourcePage: "rejoignez-nous",
          email: newsletterData.email,
          consent: newsletterData.consent,
          payload: { channels: ["email", "sms", "whatsapp"] },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setNewsletterStatus(error.error || "Inscription impossible.");
        return;
      }

      setNewsletterStatus("Votre inscription est confirmée. Merci !");
      setNewsletterData({ email: "", consent: false });
    } catch {
      setNewsletterStatus("Le serveur n'est pas disponible pour l'instant.");
    }
  }

  return <PageLayout heroClass="hero-join" eyebrow={settings.eyebrow} title={settings.title} copy={settings.copy}><section className="content-section join-grid"><ContactForm settings={settings} /><ContactForm partner settings={settings} /></section><section className="content-section donation-panel"><h2>Soutenir Génération Verte RDC</h2><p>{settings.donationText}</p><label className="donation-amount-label">Montant du don<select value={donationAmount} onChange={(event) => setDonationAmount(event.target.value)}><option value="10">10 $</option><option value="25">25 $</option><option value="50">50 $</option><option value="100">100 $</option></select></label><button className="btn btn-yellow" type="button" onClick={continueToDonation}>Continuer vers la plateforme de don</button>{donationStatus && <p role="status" className="form-note">{donationStatus}</p>}</section><form className="content-section newsletter-panel" onSubmit={handleNewsletterSubmit}><h2>{settings.newsletterTitle}</h2><label>Email<input required type="email" value={newsletterData.email} onChange={(event) => setNewsletterData({ ...newsletterData, email: event.target.value })} /></label><label className="consent-label"><input required type="checkbox" checked={newsletterData.consent} onChange={(event) => setNewsletterData({ ...newsletterData, consent: event.target.checked })} /> {settings.newsletterConsent}</label><button className="btn btn-yellow" type="submit">S'inscrire</button>{newsletterStatus && <p role="status" className="form-note">{newsletterStatus}</p>}</form></PageLayout>;
}
