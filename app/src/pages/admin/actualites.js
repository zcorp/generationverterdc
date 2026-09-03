import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

export default function AdminNewsPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [news, setNews] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [message, setMessage] = useState("");
  const [savingNewsKey, setSavingNewsKey] = useState("");
  const [newNews, setNewNews] = useState({ category: "", title: "", summary: "", imageUrl: "", embedUrl: "", linkUrl: "", linkLabel: "", videoDisplayMode: "iframe", published: false, archived: false, display_order: 0 });
  const [creatingNew, setCreatingNew] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedKey, setDraggedKey] = useState(null);
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [imageSelectorTarget, setImageSelectorTarget] = useState({ type: "new", newsKey: null });

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;

    fetch("/api/admin/news")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.news && setNews(content.news))
      .catch(() => setMessage("Impossible de charger les actualités."));

    fetch("/api/admin/uploaded-images")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.images && setUploadedImages(content.images))
      .catch(() => undefined);
  }, [activeSession, authMode]);

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";
  const orderedNews = [...news].sort((a, b) => (Number(a.display_order || 0) - Number(b.display_order || 0)) || (a.title || "").localeCompare(b.title || ""));
  const visibleNews = orderedNews.filter((item) => (showArchived ? true : !item.archived));
  const filteredNews = visibleNews.filter((item) => {
    if (statusFilter === "published") return item.published && !item.archived;
    if (statusFilter === "draft") return !item.published && !item.archived;
    if (statusFilter === "archived") return item.archived;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredNews.length / pageSize));
  const paginatedNews = filteredNews.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const validUploadedImages = uploadedImages.filter((image) => typeof image?.url === "string" && image.url.trim().length > 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, showArchived, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function updateNews(item) {
    setSavingNewsKey(item.key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, imageUrl: item.imageUrl?.trim() || "", embedUrl: item.embedUrl?.trim() || "", linkUrl: item.linkUrl?.trim() || "", display_order: Number(item.display_order || 0), archived: Boolean(item.archived) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Enregistrement de l'actualité impossible.");
        return;
      }
      setNews((currentNews) => currentNews.map((newsItem) => newsItem.key === item.key ? result.newsItem : newsItem));
      setMessage("Actualité enregistrée.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setSavingNewsKey("");
    }
  }

  async function createNewNews() {
    if (!newNews.category.trim() || !newNews.title.trim() || !newNews.summary.trim()) {
      setMessage("Veuillez remplir les champs obligatoires.");
      return;
    }
    setCreatingNew(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newNews, imageUrl: newNews.imageUrl?.trim() || "", embedUrl: newNews.embedUrl?.trim() || "", linkUrl: newNews.linkUrl?.trim() || "", display_order: Number(newNews.display_order || 0), archived: Boolean(newNews.archived) }),
      });
      if (!response.ok) {
        setMessage("Création impossible.");
        return;
      }
      const result = await response.json();
      setNews([...news, result.newsItem]);
      setNewNews({ category: "", title: "", summary: "", imageUrl: "", embedUrl: "", linkUrl: "", linkLabel: "", videoDisplayMode: "iframe", published: false, archived: false, display_order: news.length });
      setMessage("Actualité créée avec succès.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setCreatingNew(false);
    }
  }

  async function deleteNews(key) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette actualité ?")) return;
    setDeletingKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/news", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) {
        setMessage("Suppression impossible.");
        return;
      }
      setNews(news.filter((item) => item.key !== key));
      setMessage("Actualité supprimée.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setDeletingKey(null);
    }
  }

  function changeNews(key, field, value) {
    setNews((currentNews) => currentNews.map((item) => item.key === key ? { ...item, [field]: value } : item));
  }

  function reorderNews(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const nextOrder = [...orderedNews];
    const fromIndex = nextOrder.findIndex((item) => item.key === sourceKey);
    const targetIndex = nextOrder.findIndex((item) => item.key === targetKey);
    if (fromIndex < 0 || targetIndex < 0) return;

    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    const reordered = nextOrder.map((item, index) => ({ ...item, display_order: index }));
    setNews(reordered);

    reordered.forEach((item) => {
      fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, archived: Boolean(item.archived), display_order: Number(item.display_order || 0) }),
      }).catch(() => undefined);
    });

    setMessage("Ordre d’affichage mis à jour.");
  }

  async function persistUploadedImage(dataUrl, label = "") {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) return "";

    try {
      const response = await fetch("/api/admin/uploaded-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, label }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return "";

      setUploadedImages((currentImages) => [result.image, ...currentImages.filter((image) => image.key !== result.image?.key)]);
      return result.image?.url || dataUrl;
    } catch {
      return dataUrl;
    }
  }

  async function deleteUploadedImage(key) {
    if (!key || !confirm("Supprimer cette image de la bibliothèque ?")) return;

    try {
      const response = await fetch("/api/admin/uploaded-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) {
        setMessage("Suppression de l'image impossible.");
        return;
      }
      setUploadedImages((currentImages) => currentImages.filter((image) => image.key !== key));
      setMessage("Image supprimée de la bibliothèque.");
    } catch {
      setMessage("La suppression de l'image a échoué.");
    }
  }

  async function handleLocalImageUpload(event, target = "new", newsKey = null) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setMessage("Veuillez choisir une image valide.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl = String(reader.result || "");
        const reusableUrl = await persistUploadedImage(imageDataUrl, file.name || "Image locale");
        const finalUrl = reusableUrl || imageDataUrl;

        if (target === "new") {
          setNewNews((current) => ({ ...current, imageUrl: finalUrl }));
        } else if (target === "edit" && newsKey) {
          changeNews(newsKey, "imageUrl", finalUrl);
        }
        setMessage("Image locale enregistrée et ajoutée à la bibliothèque réutilisable.");
      };
      reader.readAsDataURL(file);
    } catch {
      setMessage("L'image n'a pas pu être chargée.");
    }
  }

  function openImageSelector(target, newsKey = null) {
    setImageSelectorTarget({ type: target, newsKey });
    setImageSelectorOpen(true);
  }

  function selectImageFromLibrary(imageUrl) {
    if (imageSelectorTarget.type === "new") {
      setNewNews((current) => ({ ...current, imageUrl: imageUrl }));
    } else if (imageSelectorTarget.type === "edit" && imageSelectorTarget.newsKey) {
      changeNews(imageSelectorTarget.newsKey, "imageUrl", imageUrl);
    }
    setImageSelectorOpen(false);
  }

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/actualites" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Actualités</h2>
          </div>
          <span className="admin-section-hint">Fil d’actualité, images et contenus embarqués</span>
        </div>

        <div className="admin-add-form">
          <h3>Ajouter une nouvelle actualité</h3>
          <div className="form-row">
            <label>
              Catégorie
              <input type="text" value={newNews.category} onChange={(e) => setNewNews({ ...newNews, category: e.target.value })} placeholder="ex: Terrain" />
            </label>
            <label>
              Titre
              <input type="text" value={newNews.title} onChange={(e) => setNewNews({ ...newNews, title: e.target.value })} placeholder="ex: Ateliers de sensibilisation" />
            </label>
            <label>
              Ordre
              <input type="number" min="0" value={newNews.display_order} onChange={(e) => setNewNews({ ...newNews, display_order: Number(e.target.value || 0) })} />
            </label>
          </div>
          <div className="form-row">
            <label className="wide-field">
              Résumé
              <textarea rows="3" value={newNews.summary} onChange={(e) => setNewNews({ ...newNews, summary: e.target.value })} placeholder="Résumé de l’actualité..." />
            </label>
          </div>
          <div className="form-row">
            <label>
              URL image
              <input type="url" value={newNews.imageUrl} onChange={(e) => setNewNews({ ...newNews, imageUrl: e.target.value })} placeholder="https://... ou image locale" />
            </label>
            <label>
              URL embed (YouTube, vidéo, etc.)
              <input type="url" value={newNews.embedUrl} onChange={(e) => setNewNews({ ...newNews, embedUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            </label>
            <label>
              Type de rendu vidéo
              <select value={newNews.videoDisplayMode} onChange={(e) => setNewNews({ ...newNews, videoDisplayMode: e.target.value })}>
                <option value="iframe">Vidéo embarquée (iframe)</option>
                <option value="thumbnail">Miniature cliquable</option>
              </select>
            </label>
            <label>
              Lien externe
              <input type="url" value={newNews.linkUrl} onChange={(e) => setNewNews({ ...newNews, linkUrl: e.target.value })} placeholder="https://..." />
            </label>
            <label>
              Libellé du lien
              <input value={newNews.linkLabel} onChange={(e) => setNewNews({ ...newNews, linkLabel: e.target.value })} placeholder="Lire l'article" />
            </label>
          </div>
          <div className="helper-callout">
            <strong>Illustration et intégration</strong>
            <span>Tu peux renseigner une image et/ou une URL de vidéo, mais le public n’affiche qu’un seul aperçu selon ce qui est disponible : image ou vidéo.</span>
          </div>
          <div className="form-row thumbnail-picker-row">
            <div className="thumbnail-picker-box">
              {newNews.imageUrl ? (
                <img src={newNews.imageUrl} alt="Illustration sélectionnée" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="thumbnail-empty">Aucune image</div>
              )}
            </div>
            <div className="thumbnail-picker-actions">
              <button type="button" className="btn btn-white" onClick={() => openImageSelector("new")}>Choisir dans la bibliothèque</button>
              <label className="upload-inline-label">
                <span>Téléverser une image</span>
                <input type="file" accept="image/*" onChange={(event) => handleLocalImageUpload(event, "new")} />
              </label>
            </div>
          </div>
          <div className="form-row">
            <label className="admin-check">
              <input type="checkbox" checked={newNews.published} onChange={(e) => setNewNews({ ...newNews, published: e.target.checked })} />
              Publier cette actualité
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={newNews.archived} onChange={(e) => setNewNews({ ...newNews, archived: e.target.checked })} />
              Archiver
            </label>
            <button className="btn btn-yellow" type="button" onClick={createNewNews} disabled={creatingNew}>{creatingNew ? "Création..." : "Créer"}</button>
          </div>
        </div>

        <div className="admin-toggle-row">
          <label className="admin-check">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Afficher les éléments archivés
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-filter-select">
            <option value="all">Tout le flux</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archivés</option>
          </select>
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="admin-filter-select">
            <option value={5}>5 par page</option>
            <option value={10}>10 par page</option>
            <option value={20}>20 par page</option>
          </select>
        </div>

        <div className="admin-library">
          <h3>Images déjà téléversées</h3>
          {validUploadedImages.length === 0 ? (
            <p className="admin-empty-state">Aucune image enregistrée pour le moment.</p>
          ) : (
            <div className="uploaded-image-grid">
              {validUploadedImages.map((image) => (
                <div key={image.key} className="uploaded-image-card">
                  <img src={image.url} alt={image.label || "Image uploadée"} onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  <div className="uploaded-image-actions">
                    <button type="button" className="btn btn-yellow" onClick={() => setNewNews((current) => ({ ...current, imageUrl: image.url }))}>Utiliser</button>
                    <button type="button" className="btn btn-danger" onClick={() => deleteUploadedImage(image.key)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {paginatedNews.length === 0 ? (
          <div className="empty-state-card">Aucun élément ne correspond à ce filtre pour le moment.</div>
        ) : paginatedNews.map((item) => (
          <form className="admin-media" noValidate key={item.key} draggable onDragStart={() => setDraggedKey(item.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderNews(draggedKey, item.key)} onSubmit={(event) => {
            event.preventDefault();
            updateNews(item);
          }}>
            <div className="admin-media-heading">
              <span className="media-type-badge">Actualité</span>
              <strong>{item.key}</strong>
              <span className={item.archived ? "draft-badge" : item.published ? "published-badge" : "draft-badge"}>{item.archived ? "Archivé" : item.published ? "Publié" : "Brouillon"}</span>
            </div>
            <div className="admin-drag-handle" aria-label="Déplacer">⋮⋮</div>
            <label>
              Catégorie
              <input required value={item.category || ""} onChange={(event) => changeNews(item.key, "category", event.target.value)} />
            </label>
            <label>
              Titre
              <input required value={item.title || ""} onChange={(event) => changeNews(item.key, "title", event.target.value)} />
            </label>
            <label>
              Ordre
              <input type="number" min="0" value={Number(item.display_order || 0)} onChange={(event) => changeNews(item.key, "display_order", Number(event.target.value || 0))} />
            </label>
            <label className="wide-field">
              Résumé
              <textarea required rows="3" value={item.summary || ""} onChange={(event) => changeNews(item.key, "summary", event.target.value)} />
            </label>
            <label>
              URL image
              <input type="url" value={item.imageUrl || ""} onChange={(event) => changeNews(item.key, "imageUrl", event.target.value)} />
            </label>
            <label>
              URL embed
              <input type="url" value={item.embedUrl || ""} onChange={(event) => changeNews(item.key, "embedUrl", event.target.value)} />
            </label>
            <label>
              Type de rendu vidéo
              <select value={item.videoDisplayMode || "iframe"} onChange={(event) => changeNews(item.key, "videoDisplayMode", event.target.value)}>
                <option value="iframe">Vidéo embarquée (iframe)</option>
                <option value="thumbnail">Miniature cliquable</option>
              </select>
            </label>
            <label>
              Lien externe
              <input type="url" value={item.linkUrl || ""} onChange={(event) => changeNews(item.key, "linkUrl", event.target.value)} />
            </label>
            <label>
              Libellé du lien
              <input value={item.linkLabel || ""} onChange={(event) => changeNews(item.key, "linkLabel", event.target.value)} placeholder="Lire l'article" />
            </label>
            <div className="helper-callout compact">
              <strong>Illustration</strong>
              <span>Choisis une image réutilisable ou téléverse une nouvelle photo pour l’actualité.</span>
            </div>
            <div className="form-row thumbnail-picker-row">
              <div className="thumbnail-picker-box">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="Illustration de l'actualité" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="thumbnail-empty">Aucune image</div>
                )}
              </div>
              <div className="thumbnail-picker-actions">
                <button type="button" className="btn btn-white" onClick={() => openImageSelector("edit", item.key)}>Choisir dans la bibliothèque</button>
                <label className="upload-inline-label">
                  <span>Téléverser une image</span>
                  <input type="file" accept="image/*" onChange={(event) => handleLocalImageUpload(event, "edit", item.key)} />
                </label>
              </div>
            </div>
            <div className="admin-inline-actions">
              <label className="admin-check">
                <input type="checkbox" checked={item.published} onChange={(event) => changeNews(item.key, "published", event.target.checked)} />
                Publier cette actualité
              </label>
              <label className="admin-check">
                <input type="checkbox" checked={Boolean(item.archived)} onChange={(event) => changeNews(item.key, "archived", event.target.checked)} />
                Archiver
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-yellow" type="submit" disabled={savingNewsKey === item.key}>{savingNewsKey === item.key ? "Enregistrement..." : "Enregistrer"}</button>
              <button className="btn btn-danger" type="button" onClick={() => deleteNews(item.key)} disabled={deletingKey === item.key}>{deletingKey === item.key ? "Suppression..." : "Supprimer"}</button>
            </div>
          </form>
        ))}

        {filteredNews.length > 0 && (
          <div className="admin-pagination">
            <button type="button" className="btn btn-white" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Précédent</button>
            <span>Page {currentPage} / {totalPages}</span>
            <button type="button" className="btn btn-white" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Suivant</button>
          </div>
        )}
      </section>

      {message && <p role="status" className="admin-message">{message}</p>}

      {imageSelectorOpen && (
        <div className="modal-overlay" onClick={() => setImageSelectorOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Choisir une image de la bibliothèque</h2>
              <button type="button" className="modal-close" onClick={() => setImageSelectorOpen(false)}>✕</button>
            </div>
            <div className="modal-content">
              {validUploadedImages.length === 0 ? (
                <p className="admin-empty-state">Aucune image enregistrée pour le moment.</p>
              ) : (
                <div className="modal-image-grid">
                  {validUploadedImages.map((image) => (
                    <button key={image.key} type="button" className="modal-image-choice" onClick={() => selectImageFromLibrary(image.url)}>
                      <img src={image.url} alt={image.label || "Image"} onError={(event) => { event.currentTarget.style.display = "none"; }} />
                      {image.label && <span className="image-label">{image.label}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  </AdminShell>;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return { props: { session, authMode: process.env.ADMIN_AUTH_MODE || "credentials" } };
}
