import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

export default function AdminIndicatorsPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [stats, setStats] = useState([]);
  const [message, setMessage] = useState("");
  const [newStat, setNewStat] = useState({ value: "", label: "", published: false, display_order: 0 });
  const [creatingNew, setCreatingNew] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [draggedKey, setDraggedKey] = useState(null);

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;
    fetch("/api/admin/impact-stats")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.impactStats && setStats(content.impactStats))
      .catch(() => setMessage("Impossible de charger les indicateurs."));
  }, [activeSession, authMode]);

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";

  const orderedStats = [...stats].sort((a, b) => (Number(a.display_order || 0) - Number(b.display_order || 0)) || a.key.localeCompare(b.key));

  function updateStat(stat) {
    fetch("/api/admin/impact-stats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...stat, display_order: Number(stat.display_order || 0) })
    })
      .then((response) => {
        setMessage(response.ok ? "Indicateur enregistré." : "Enregistrement impossible.");
      })
      .catch(() => setMessage("Le serveur est indisponible. Réessayez."));
  }

  async function createNewStat() {
    if (!newStat.value.trim() || !newStat.label.trim()) {
      setMessage("Veuillez remplir tous les champs.");
      return;
    }
    setCreatingNew(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/impact-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newStat, display_order: Number(newStat.display_order || 0) })
      });
      if (!response.ok) {
        setMessage("Création impossible.");
        return;
      }
      const result = await response.json();
      setStats([...stats, result.impactStat]);
      setNewStat({ value: "", label: "", published: false, display_order: stats.length });
      setMessage("Indicateur créé avec succès.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setCreatingNew(false);
    }
  }

  async function deleteStat(key) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet indicateur ?")) return;
    setDeletingKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/impact-stats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });
      if (!response.ok) {
        setMessage("Suppression impossible.");
        return;
      }
      setStats(stats.filter((stat) => stat.key !== key));
      setMessage("Indicateur supprimé.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setDeletingKey(null);
    }
  }

  function changeStat(key, field, value) {
    setStats((currentStats) => currentStats.map((stat) => stat.key === key ? { ...stat, [field]: value } : stat));
  }

  function reorderStats(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const nextOrder = [...orderedStats];
    const fromIndex = nextOrder.findIndex((stat) => stat.key === sourceKey);
    const targetIndex = nextOrder.findIndex((stat) => stat.key === targetKey);
    if (fromIndex < 0 || targetIndex < 0) return;

    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    const reordered = nextOrder.map((stat, index) => ({ ...stat, display_order: index }));
    setStats(reordered);

    reordered.forEach((stat) => {
      fetch("/api/admin/impact-stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stat, display_order: indexToValue(stat.display_order) })
      }).catch(() => undefined);
    });

    setMessage("Ordre d’affichage mis à jour.");
  }

  function indexToValue(intValue) {
    return Number.isFinite(Number(intValue)) ? Number(intValue) : 0;
  }

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/indicateurs" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Chiffres clés</p>
            <h2>Indicateurs d'impact</h2>
          </div>
          <span className="admin-section-hint">Visible sur la page Impact</span>
        </div>

        <div className="admin-add-form">
          <h3>Ajouter un nouvel indicateur</h3>
          <div className="form-row">
            <label>
              Valeur
              <input type="text" value={newStat.value} onChange={(e) => setNewStat({ ...newStat, value: e.target.value })} placeholder="ex: 2500" />
            </label>
            <label>
              Libellé
              <input type="text" value={newStat.label} onChange={(e) => setNewStat({ ...newStat, label: e.target.value })} placeholder="ex: Bénéficiaires directs" />
            </label>
            <label>
              Ordre
              <input type="number" min="0" value={newStat.display_order} onChange={(e) => setNewStat({ ...newStat, display_order: Number(e.target.value || 0) })} />
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={newStat.published} onChange={(e) => setNewStat({ ...newStat, published: e.target.checked })} />
              Publié
            </label>
            <button className="btn btn-yellow" type="button" onClick={createNewStat} disabled={creatingNew}>{creatingNew ? "Création..." : "Créer"}</button>
          </div>
        </div>

        {orderedStats.map((stat) => (
          <form className="admin-stat" key={stat.key} draggable onDragStart={() => setDraggedKey(stat.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderStats(draggedKey, stat.key)} onSubmit={(event) => {
            event.preventDefault();
            updateStat(stat);
          }}>
            <div className="admin-drag-handle" aria-label="Déplacer">⋮⋮</div>
            <label>
              Valeur
              <input value={stat.value} onChange={(event) => changeStat(stat.key, "value", event.target.value)} />
            </label>
            <label>
              Libellé
              <input value={stat.label} onChange={(event) => changeStat(stat.key, "label", event.target.value)} />
            </label>
            <label>
              Ordre
              <input type="number" min="0" value={Number(stat.display_order || 0)} onChange={(event) => changeStat(stat.key, "display_order", Number(event.target.value || 0))} />
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={stat.published} onChange={(event) => changeStat(stat.key, "published", event.target.checked)} />
              Publié
            </label>
            <div className="form-actions">
              <button className="btn btn-yellow" type="submit">Enregistrer</button>
              <button className="btn btn-danger" type="button" onClick={() => deleteStat(stat.key)} disabled={deletingKey === stat.key}>{deletingKey === stat.key ? "Suppression..." : "Supprimer"}</button>
            </div>
          </form>
        ))}
      </section>

      {message && <p role="status" className="admin-message">{message}</p>}
    </main>
  </AdminShell>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { session, authMode: process.env.ADMIN_AUTH_MODE || "credentials" } };
}
