import { useEffect, useState } from "react";
import { impactStats as fallbackImpactStats, pillars as fallbackPillars, defaultHomeSettings } from "../data/publicContent";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { siteUrl } from "../lib/siteUrl";

export default function Home() {
  const [settings, setSettings] = useState(defaultHomeSettings);
  const [impactStats, setImpactStats] = useState(fallbackImpactStats);
  const [pillars, setPillars] = useState(fallbackPillars);

  function cleanHomeText(value) {
    return typeof value === "string" ? value.replace(/\bTshopo\b/gi, "").replace(/\s{2,}/g, " ").trim() : value;
  }

  useEffect(() => {
    fetch(siteUrl("/api/public-content"), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (!content) return;
        if (content.impactStats) setImpactStats(content.impactStats);
        if (content.settings?.home_page) {
          const nextSettings = { ...defaultHomeSettings, ...content.settings.home_page };
          setSettings({ ...nextSettings, heroTitle: cleanHomeText(nextSettings.heroTitle), heroCopy: cleanHomeText(nextSettings.heroCopy) });
        }
        if (content.settings?.pillars_page?.pillars?.length) setPillars(content.settings.pillars_page.pillars);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <SiteHeader />

      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <h1>{settings.heroTitle}</h1>
            <p>{settings.heroCopy}</p>
            <div className="hero-actions"><a className="btn btn-yellow" href={siteUrl("/piliers-action")}>{settings.heroPrimaryCta}</a><a className="btn btn-outline-white" href={siteUrl("/rejoignez-nous")}>{settings.heroSecondaryCta}</a></div>
          </div>
          <div className="hero-image" role="img" aria-label="Jeunes plants dans une forêt tropicale" />
        </section>

        <section id="actions" className="home-section">
          <h2>{settings.pillarsTitle}</h2><p className="section-lead">{settings.pillarsLead}</p>
          <div className="pillar-grid">{pillars.map((pillar) => <a className="pillar-teaser" href={siteUrl("/piliers-action")} key={pillar.key || pillar.title}><div className="point-icon" aria-hidden="true">{pillar.icon}</div><p className="title">{pillar.title}</p><p className="copy">{pillar.copy}</p></a>)}</div>
        </section>

        <section id="impact" className="home-section">
          <h2>{settings.impactTitle}</h2>
          <div className="impact-grid">{impactStats.map((stat) => <div className="impact-card" key={stat.key || stat.label}><p className="value">{stat.value}</p><p className="label">{stat.label}</p></div>)}</div>
        </section>

        <section id="rejoindre" className="join-banner"><div><p className="title">{settings.joinTitle}</p><p className="copy">{settings.joinCopy}</p></div><div className="hero-actions"><a className="btn btn-yellow" href={siteUrl("/rejoignez-nous")}>{settings.joinCta}</a></div></section>
      </main>

      <SiteFooter />
    </div>
  );
}
