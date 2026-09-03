import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { defaultAboutSettings } from "../data/publicContent";

export default function AboutPage() {
  const [settings, setSettings] = useState(defaultAboutSettings);

  useEffect(() => {
    fetch("/api/public-content", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.about_page) {
          setSettings({ ...defaultAboutSettings, ...content.settings.about_page });
        }
      })
      .catch(() => undefined);
  }, []);

  const values = settings.values?.length ? settings.values : defaultAboutSettings.values;
  const facts = settings.facts?.length ? settings.facts : defaultAboutSettings.facts;

  return <PageLayout heroClass="hero-actions" eyebrow={settings.heroEyebrow} title={settings.heroTitle} copy={settings.heroCopy}>
    <section className="content-section two-column"><div><p className="eyebrow">{settings.missionEyebrow}</p><h2>{settings.missionTitle}</h2><p>{settings.missionParagraph1}</p><p>{settings.missionParagraph2}</p><p>{settings.missionParagraph3}</p></div><blockquote>« {settings.quote} »<cite>{settings.quoteCaption}</cite></blockquote></section>
    <section className="content-section two-column about-highlight"><div><p className="eyebrow">{settings.visionEyebrow}</p><h2>{settings.visionTitle}</h2><p>{settings.visionCopy}</p></div><div className="fact-list">{facts.map((fact) => <p key={fact.title}><strong>{fact.title}</strong><span>{fact.copy}</span></p>)}</div></section>
    <section className="content-section"><p className="eyebrow">{settings.valuesEyebrow}</p><h2>{settings.valuesTitle}</h2><div className="value-grid">{values.map((value, index) => <article key={value.title}><span className="value-number">{String(index + 1).padStart(2, "0")}</span><h3>{value.title}</h3><p>{value.copy}</p></article>)}</div></section>
    <section className="strip"><div><p className="eyebrow">{settings.governanceEyebrow}</p><h2>{settings.governanceTitle}</h2></div><p>{settings.governanceCopy}</p></section>
  </PageLayout>;
}
