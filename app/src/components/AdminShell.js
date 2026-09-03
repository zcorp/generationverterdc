import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";

const NAV_GROUPS = [
  {
    items: [{ href: "/admin", icon: "◈", label: "Tableau de bord" }],
  },
  {
    label: "Contenus publics",
    items: [
      { href: "/admin/accueil", icon: "⌂", label: "Accueil" },
      { href: "/admin/qui-sommes-nous", icon: "❖", label: "Qui sommes-nous" },
      { href: "/admin/piliers-action", icon: "✦", label: "Nos piliers d'action" },
      { href: "/admin/indicateurs", icon: "◉", label: "Indicateurs d'impact" },
      { href: "/admin/medias", icon: "▣", label: "Médiathèque" },
      { href: "/admin/actualites", icon: "◇", label: "Actualités" },
      { href: "/admin/rejoignez-nous", icon: "★", label: "Rejoignez-nous" },
      { href: "/admin/contact", icon: "✉", label: "Contact" },
    ],
  },
  {
    label: "Communauté",
    items: [
      { href: "/admin/utilisateurs", icon: "◆", label: "Utilisateurs" },
      { href: "/admin/campagnes", icon: "▤", label: "Campagnes" },
      { href: "/admin/historique", icon: "☰", label: "Historique" },
    ],
  },
];

export default function AdminShell({ email, session, children }) {
  const router = useRouter();
  const isActive = (path) => router.pathname === path || (path !== "/admin" && router.pathname.startsWith(path));

  async function handleLogout() {
    await signOut({ redirect: false, callbackUrl: "/admin?logout=1&refresh=" + Date.now() });
    window.location.href = "/admin?logout=1&refresh=" + Date.now();
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand admin-brand-image" href="/admin"><img src="/brand/logo.png" alt="Génération Verte RDC" className="admin-brand-logo" /><span className="admin-brand-text">Administration</span></Link>
      <nav className="admin-nav" aria-label="Navigation administration">
        {NAV_GROUPS.map((group) => <div key={group.label || "root"} style={{ display: "contents" }}>
          {group.label && <p className="admin-nav-label">{group.label}</p>}
          {group.items.map((item) => <Link key={item.href} className={isActive(item.href) ? "is-active" : ""} href={item.href}><span>{item.icon}</span> {item.label}</Link>)}
        </div>)}
        <p className="admin-nav-label">Autre</p>
        <a href="/" target="_blank" rel="noreferrer"><span>↗</span> Voir le site</a>
        {session && <button className="btn btn-outline-forest" type="button" onClick={handleLogout} style={{ marginTop: 12 }}>Se déconnecter</button>}
      </nav>
      <div className="admin-sidebar-footer"><span className="status-dot" /> Mode développement<br /><small>{email}</small></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">Espace de gestion</p>
          <h1>Bonjour, équipe GV-RDC</h1>
        </div>
        {session && <div className="admin-user"><span className="user-avatar">{email.slice(0, 1).toUpperCase()}</span><span>{email}</span></div>}
      </header>
      {children}
    </div>
  </div>;
}
