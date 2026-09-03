import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function PageLayout({ eyebrow, title, copy, heroClass = "hero-actions", children }) {
  return (
    <div><SiteHeader /><main><section className={`page-hero-image ${heroClass}`}><p>{eyebrow}</p><h1>{title}</h1>{copy && <p className="hero-copy">{copy}</p>}</section>{children}</main><SiteFooter /></div>
  );
}
