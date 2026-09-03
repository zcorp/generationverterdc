import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";
import { pillars as fallbackPillars } from "../../data/publicContent";

function normalizePillars(list = []) {
  return [...list]
    .map((pillar, index) => ({
      key: pillar.key || `pillar-${index + 1}`,
      icon: pillar.icon || "✦",
      title: pillar.title || "",
      copy: pillar.copy || "",
      display_order: Number(pillar.display_order ?? index),
    }))
    .sort((a, b) => (Number(a.display_order || 0) - Number(b.display_order || 0)) || a.key.localeCompare(b.key));
}

export default function AdminPillarsPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [pillars, setPillars] = useState(() => normalizePillars(fallbackPillars));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [activeIconField, setActiveIconField] = useState(null);
  const [newPillar, setNewPillar] = useState({ key: "", icon: "✦", title: "", copy: "", display_order: 0 });

  const suggestedIcons = ["✦", "◎", "♧", "✧", "❀", "☼", "✿", "❋", "♻", "🌱", "💧", "🌍", "📚", "🌿", "☀", "⚑"]; 

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/site-settings?key=pillars_page")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.settings?.pillars_page?.pillars?.length) {
          setPillars(normalizePillars(content.settings.pillars_page.pillars));
        }
      })
      .catch(() => setMessage("Impossible de charger les piliers d'action."));
  }, [activeSession, authMode]);

  function updatePillar(index, field, value) {
    const next = [...pillars];
    next[index] = { ...next[index], [field]: value };
    setPillars(next);
  }

  function reorderPillars(sourceIndex, targetIndex) {
    if (sourceIndex === null || targetIndex === null || sourceIndex === targetIndex) return;
    const next = [...pillars];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    const reordered = next.map((pillar, index) => ({ ...pillar, display_order: index }));
    setPillars(reordered);
    setMessage("Ordre d'affichage mis à jour.");
  }

  function applySuggestedIcon(iconValue, mode = "new") {
    if (mode === "new") {
      setNewPillar((current) => ({ ...current, icon: iconValue }));
    } else if (activeIconField !== null) {
      updatePillar(activeIconField, "icon", iconValue);
    }
    setShowIconPicker(false);
    setActiveIconField(null);
  }

  function openIconPicker(fieldIndex = null) {
    setActiveIconField(fieldIndex);
    setShowIconPicker(true);
  }

  function createPillar() {
    if (!newPillar.title.trim() || !newPillar.copy.trim()) {
      setMessage("Le titre et la description du pilier sont obligatoires.");
      return;
    }

    setCreatingNew(true);
    setMessage("");

    const next = [...pillars, {
      ...newPillar,
      key: newPillar.key || `pillar-${Date.now()}`,
      title: newPillar.title.trim(),
      copy: newPillar.copy.trim(),
      icon: newPillar.icon.trim() || "✦",
      display_order: pillars.length,
    }];

    setPillars(next);
    setNewPillar({ key: "", icon: "✦", title: "", copy: "", display_order: 0 });
    setMessage("Nouveau pilier ajouté dans la liste.");
    setCreatingNew(false);
  }

  function deletePillar(index) {
    if (!confirm("Supprimer ce pilier d'action ?")) return;
    const next = pillars.filter((_, currentIndex) => currentIndex !== index).map((pillar, newIndex) => ({ ...pillar, display_order: newIndex }));
    setPillars(next);
    setMessage("Pilier supprimé.");
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    const orderedPillars = normalizePillars(pillars).map((pillar, index) => ({ ...pillar, display_order: index }));
    setPillars(orderedPillars);

    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "pillars_page", content: { pillars: orderedPillars } }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setMessage(error.error || "Enregistrement impossible.");
        return;
      }

      setMessage("Piliers enregistrés.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/piliers-action" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Nos piliers d'action</h2>
          </div>
          <span className="admin-section-hint">Visible sur l'accueil et sur la page dédiée</span>
        </div>

        <div className="admin-add-form">
          <h3>Ajouter un nouveau pilier</h3>
          <div className="form-row">
            <label>
              Icône
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={newPillar.icon} onClick={() => openIconPicker(null)} onFocus={() => openIconPicker(null)} onChange={(e) => setNewPillar({ ...newPillar, icon: e.target.value })} style={{ maxWidth: 80 }} />
                <button type="button" className="btn btn-light" onClick={() => openIconPicker(null)}>Choisir</button>
              </div>
            </label>
            <label className="wide-field">
              Titre
              <input value={newPillar.title} onChange={(e) => setNewPillar({ ...newPillar, title: e.target.value })} placeholder="Ex : Epargne scolaire" />
            </label>
          </div>
          {showIconPicker && (
            <div className="admin-add-form" style={{ marginTop: 12, paddingTop: 12 }}>
              <h4 style={{ margin: "0 0 10px" }}>Icônes suggérées</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {suggestedIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => applySuggestedIcon(icon, activeIconField === null ? "new" : "existing")}
                    style={{
                      minWidth: 42,
                      height: 42,
                      borderRadius: 8,
                      border: "1px solid #d8e4d7",
                      background: "#fff",
                      fontSize: 22,
                      cursor: "pointer"
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="form-row">
            <label className="wide-field">
              Description
              <textarea rows="2" value={newPillar.copy} onChange={(e) => setNewPillar({ ...newPillar, copy: e.target.value })} placeholder="Décrivez l'action ou le programme" />
            </label>
          </div>
          <button className="btn btn-yellow" type="button" onClick={createPillar} disabled={creatingNew}>{creatingNew ? "Ajout..." : "Ajouter le pilier"}</button>
        </div>

        {pillars.map((pillar, index) => (
          <div className="admin-add-form" key={pillar.key || `${pillar.title}-${index}`} draggable onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { reorderPillars(draggedIndex, index); setDraggedIndex(null); }}>
            <div className="section-title compact-title">
              <h3>Pilier {index + 1}</h3>
              <span className="admin-drag-handle" aria-label="Déplacer">⋮⋮</span>
            </div>
            <div className="form-row">
              <label>
                Icône
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={pillar.icon} onClick={() => openIconPicker(index)} onFocus={() => openIconPicker(index)} onChange={(e) => updatePillar(index, "icon", e.target.value)} style={{ maxWidth: 80 }} />
                  <button type="button" className="btn btn-light" onClick={() => openIconPicker(index)}>Choisir</button>
                </div>
              </label>
              <label className="wide-field">Titre<input value={pillar.title} onChange={(e) => updatePillar(index, "title", e.target.value)} /></label>
            </div>
            <div className="form-row">
              <label className="wide-field">Description<textarea rows="2" value={pillar.copy} onChange={(e) => updatePillar(index, "copy", e.target.value)} /></label>
            </div>
            <div className="form-actions">
              <button className="btn btn-danger" type="button" onClick={() => deletePillar(index)}>Supprimer</button>
            </div>
          </div>
        ))}

        <div className="form-actions">
          <button className="btn btn-yellow" type="button" onClick={saveSettings} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
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
