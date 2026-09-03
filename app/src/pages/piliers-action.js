import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { pillars as fallbackPillars } from "../data/publicContent";

export default function ActionsPage() {
  const [pillars, setPillars] = useState(fallbackPillars);

  useEffect(() => {
    fetch("/api/public-content", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.pillars_page?.pillars?.length) {
          setPillars(content.settings.pillars_page.pillars);
        }
      })
      .catch(() => undefined);
  }, []);

  return <PageLayout heroClass="hero-actions" eyebrow="Découvrir GV-RDC" title="Nos piliers d'action"><section className="content-section pillar-list">{pillars.map((pillar, index) => <article className="pillar-card" key={pillar.key || pillar.title}><div className="point-icon">{pillar.icon}</div><div><h2>{index + 1}. {pillar.title}</h2><p>{pillar.copy}</p></div></article>)}</section></PageLayout>;
}
