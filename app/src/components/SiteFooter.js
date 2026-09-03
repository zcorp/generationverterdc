import { siteUrl } from "../lib/siteUrl";
import SocialLinks from "./SocialLinks";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><p className="footer-title">Génération Verte RDC</p><p className="footer-copy">Kisangani, province de la Tshopo<br />Éduquer, agir, transmettre.</p><SocialLinks /></div>
      <div className="footer-links"><a href={siteUrl("/piliers-action")}>Nos actions</a><a href={siteUrl("/notre-impact")}>Notre impact</a><a href={siteUrl("/actualites")}>Actualités</a><a href={siteUrl("/rejoignez-nous")}>Agir</a><a href={siteUrl("/contact")}>Contact</a></div>
    </footer>
  );
}
