import { useState } from "react";
import { siteUrl } from "../lib/siteUrl";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <a href={siteUrl("/")} aria-label="Génération Verte RDC, accueil" className="brand-link"><img className="brand-logo" src={siteUrl("/brand/logo.png")} alt="Génération Verte RDC" /></a>
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg><span>Menu</span></button>
      <nav id="main-navigation" className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Navigation principale">
        <a href={siteUrl("/")} onClick={closeMenu}>Accueil</a><a href={siteUrl("/qui-sommes-nous")} onClick={closeMenu}>Qui sommes-nous</a><a href={siteUrl("/piliers-action")} onClick={closeMenu}>Nos actions</a><a href={siteUrl("/espace-medias")} onClick={closeMenu}>Médias</a><a href={siteUrl("/notre-impact")} onClick={closeMenu}>Impact</a><a href={siteUrl("/actualites")} onClick={closeMenu}>Actualités</a><a href={siteUrl("/rejoignez-nous")} onClick={closeMenu}>Agir</a><a href={siteUrl("/contact")} onClick={closeMenu}>Contact</a>
      </nav>
      <div className="language"><a className="active" href="#">FR</a><a href="#">EN</a></div>
    </header>
  );
}
