import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/authOptions";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

export default function AdminDashboardPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [stats, setStats] = useState([]);
  const [media, setMedia] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;
    fetch("/api/admin/impact-stats")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.impactStats && setStats(content.impactStats))
      .catch(() => setMessage("Impossible de charger les indicateurs."));
  }, [activeSession, authMode]);

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;
    fetch("/api/admin/media")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.media && setMedia(content.media))
      .catch(() => setMessage("Impossible de charger les médias."));
  }, [activeSession, authMode]);

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-dashboard"><div><p className="eyebrow">Vue d'ensemble</p><h2>Votre espace de gestion</h2><p>Gérez les contenus publics de Génération Verte RDC depuis un seul endroit.</p></div><button className="btn btn-outline-forest" type="button" onClick={async () => {
        if (!activeSession) {
          window.location.reload();
          return;
        }

        await signOut({ redirect: false, callbackUrl: "/admin?logout=1&refresh=" + Date.now() });
        window.location.href = "/admin?logout=1&refresh=" + Date.now();
      }}>{activeSession ? "Se déconnecter" : "Actualiser"}</button></section>

      <div className="admin-summary">
        <Link href="/admin/indicateurs" className="summary-card"><strong>{stats.length}</strong><span>Indicateurs</span></Link>
        <Link href="/admin/medias" className="summary-card"><strong>{media.length}</strong><span>Ressources médias</span></Link>
        <Link href="/admin/medias" className="summary-card"><strong>{media.filter((item) => item.published).length}</strong><span>Contenus publiés</span></Link>
      </div>

      <section className="admin-section">
        <div className="section-title"><div><p className="eyebrow">Accès rapide</p><h2>Gestion du site</h2></div></div>
        <div className="admin-summary" style={{ marginBottom: 0 }}>
          <Link href="/admin/indicateurs" className="summary-card"><strong>◉</strong><span>Modifier les indicateurs</span></Link>
          <Link href="/admin/medias" className="summary-card"><strong>▣</strong><span>Gérer la médiathèque</span></Link>
          <Link href="/admin/actualites" className="summary-card"><strong>◇</strong><span>Gérer les actualités</span></Link>
          <Link href="/admin/rejoignez-nous" className="summary-card"><strong>✦</strong><span>Modifier Rejoignez-nous</span></Link>
          <Link href="/admin/contact" className="summary-card"><strong>✉</strong><span>Modifier le contact</span></Link>
          <Link href="/admin/historique" className="summary-card"><strong>☰</strong><span>Historique des demandes</span></Link>
          <a href="/" target="_blank" rel="noreferrer" className="summary-card"><strong>↗</strong><span>Voir le site public</span></a>
        </div>
      </section>

      {message && <p role="status" className="admin-message">{message}</p>}
    </main>
  </AdminShell>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { session, authMode: process.env.ADMIN_AUTH_MODE || "credentials" } };
}
