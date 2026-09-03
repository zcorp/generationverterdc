import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { impactStats } from "../data/publicContent";
import { siteUrl } from "../lib/siteUrl";

export default function ImpactPage() {
  const [stats, setStats] = useState(impactStats);

  useEffect(() => {
    fetch(siteUrl("/api/public-content"), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.impactStats && setStats(content.impactStats))
      .catch(() => undefined);
  }, []);

  return <PageLayout heroClass="hero-impact" eyebrow="Ressources" title="Notre impact" copy="Des chiffres simples, mis à jour régulièrement par notre équipe."><section className="content-section"><div className="impact-grid">{stats.map((stat) => <div className="impact-card impact-card-lg" key={stat.key || stat.label}><p className="value">{stat.value}</p><p className="label">{stat.label}</p></div>)}</div><p className="impact-note">Les indicateurs publiés sont actualisés par l'équipe GV-RDC.</p></section></PageLayout>;
}
