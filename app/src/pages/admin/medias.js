import { authOptions } from "../../lib/authOptions";
import { getServerSession } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import AdminLogin from "../../components/AdminLogin";

export default function AdminMediaPage({ session, authMode }) {
  const { data: clientSession } = useSession();
  const activeSession = session || clientSession;
  const [media, setMedia] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [message, setMessage] = useState("");
  const [savingMediaKey, setSavingMediaKey] = useState("");
  const [newMedia, setNewMedia] = useState({ type: "video", tag: "", title: "", copy: "", url: "", thumbnail: "", linkUrl: "", linkLabel: "", videoDisplayMode: "iframe", published: false, archived: false, display_order: 0 });
  const [creatingNew, setCreatingNew] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedKey, setDraggedKey] = useState(null);
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [imageSelectorTarget, setImageSelectorTarget] = useState({ type: "new", mediaKey: null });

  useEffect(() => {
    if (!activeSession && authMode !== "disabled") return;
    fetch("/api/admin/media")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.media && setMedia(content.media))
      .catch(() => setMessage("Impossible de charger les médias."));

    fetch("/api/admin/uploaded-images")
      .then((response) => response.ok ? response.json() : null)
      .then((content) => content?.images && setUploadedImages(content.images))
      .catch(() => undefined);
  }, [activeSession, authMode]);

  const adminEmail = activeSession?.user?.email || "local-development@gv-rdc.local";
  const orderedMedia = [...media].sort((a, b) => (Number(a.display_order || 0) - Number(b.display_order || 0)) || (a.title || "").localeCompare(b.title || ""));
  const visibleMedia = orderedMedia.filter((item) => (showArchived ? true : !item.archived));
  const filteredMedia = visibleMedia.filter((item) => {
    if (statusFilter === "published") return item.published && !item.archived;
    if (statusFilter === "draft") return !item.published && !item.archived;
    if (statusFilter === "archived") return item.archived;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / pageSize));
  const paginatedMedia = filteredMedia.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const validUploadedImages = uploadedImages.filter((image) => typeof image?.url === "string" && image.url.trim().length > 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, showArchived, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function updateMedia(item) {
    setSavingMediaKey(item.key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, url: item.url?.trim() || "", thumbnail: item.thumbnail?.trim() || "", linkUrl: item.linkUrl?.trim() || "", display_order: Number(item.display_order || 0), archived: Boolean(item.archived) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Enregistrement du média impossible.");
        return;
      }
      setMedia((currentMedia) => currentMedia.map((mediaItem) => mediaItem.key === item.key ? result.mediaItem : mediaItem));
      setMessage("Média enregistré.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setSavingMediaKey("");
    }
  }

  async function createNewMedia() {
    if (!newMedia.type || !newMedia.tag.trim() || !newMedia.title.trim() || !newMedia.copy.trim()) {
      setMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setCreatingNew(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMedia, linkUrl: newMedia.linkUrl?.trim() || "", display_order: Number(newMedia.display_order || 0), archived: Boolean(newMedia.archived) })
      });
      if (!response.ok) {
        setMessage("Création impossible.");
        return;
      }
      const result = await response.json();
      setMedia([...media, result.mediaItem]);
      setNewMedia({ type: "video", tag: "", title: "", copy: "", url: "", thumbnail: "", linkUrl: "", linkLabel: "", videoDisplayMode: "iframe", published: false, archived: false, display_order: media.length });
      setMessage("Média créé avec succès.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setCreatingNew(false);
    }
  }

  async function deleteMedia(key) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce média ?")) return;
    setDeletingKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });
      if (!response.ok) {
        setMessage("Suppression impossible.");
        return;
      }
      setMedia(media.filter((item) => item.key !== key));
      setMessage("Média supprimé.");
    } catch {
      setMessage("Le serveur est indisponible. Réessayez.");
    } finally {
      setDeletingKey(null);
    }
  }

  function changeMedia(key, field, value) {
    setMedia((currentMedia) => currentMedia.map((item) => item.key === key ? { ...item, [field]: value } : item));
  }

  function reorderMedia(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const nextOrder = [...orderedMedia];
    const fromIndex = nextOrder.findIndex((item) => item.key === sourceKey);
    const targetIndex = nextOrder.findIndex((item) => item.key === targetKey);
    if (fromIndex < 0 || targetIndex < 0) return;

    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    const reordered = nextOrder.map((item, index) => ({ ...item, display_order: index }));
    setMedia(reordered);

    reordered.forEach((item) => {
      fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, archived: Boolean(item.archived), display_order: Number(item.display_order || 0) })
      }).catch(() => undefined);
    });

    setMessage("Ordre d'affichage mis à jour.");
  }

  async function persistUploadedImage(dataUrl, label = "") {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return "";
    }

    try {
      const response = await fetch("/api/admin/uploaded-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, label })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        return "";
      }

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
        body: JSON.stringify({ key })
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

  async function handleLocalThumbnailUpload(event, target = "new", mediaKey = null) {
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
        const finalThumbnail = reusableUrl || imageDataUrl;

        if (target === "new") {
          setNewMedia((current) => ({ ...current, thumbnail: finalThumbnail }));
        } else if (target === "edit" && mediaKey) {
          changeMedia(mediaKey, "thumbnail", finalThumbnail);
        }
        setMessage("Image locale enregistrée et ajoutée à la bibliothèque réutilisable.");
      };
      reader.readAsDataURL(file);
    } catch {
      setMessage("L'image n'a pas pu être chargée.");
    }
  }

  function openImageSelector(target, mediaKey = null) {
    setImageSelectorTarget({ type: target, mediaKey });
    setImageSelectorOpen(true);
  }

  function selectImageFromLibrary(imageUrl) {
    if (imageSelectorTarget.type === "new") {
      setNewMedia((current) => ({ ...current, thumbnail: imageUrl }));
    } else if (imageSelectorTarget.type === "edit" && imageSelectorTarget.mediaKey) {
      changeMedia(imageSelectorTarget.mediaKey, "thumbnail", imageUrl);
    }
    setImageSelectorOpen(false);
  }

  if (!activeSession && authMode !== "disabled") return <AdminLogin callbackUrl="/admin/medias" />;

  return <AdminShell email={adminEmail} session={activeSession}>
    <main className="admin-content">
      <section className="admin-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">Contenus publics</p>
            <h2>Médiathèque</h2>
          </div>
          <span className="admin-section-hint">Iframes, miniatures et archivage</span>
        </div>

        <div className="admin-add-form">
          <h3>Ajouter un nouveau média</h3>
          <div className="form-row">
            <label>
              Type
              <select value={newMedia.type} onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value })}>
                <option value="video">Vidéo</option>
                <option value="resource">Ressource</option>
                <option value="activity">Activité</option>
              </select>
            </label>
            <label>
              Thème
              <input type="text" value={newMedia.tag} onChange={(e) => setNewMedia({ ...newMedia, tag: e.target.value })} placeholder="ex: Climat" />
            </label>
            <label>
              Ordre
              <input type="number" min="0" value={newMedia.display_order} onChange={(e) => setNewMedia({ ...newMedia, display_order: Number(e.target.value || 0) })} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Titre
              <input type="text" value={newMedia.title} onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })} placeholder="ex: Le changement climatique" />
            </label>
          </div>
          <div className="form-row">
            <label className="wide-field">
              Description
              <textarea rows="2" value={newMedia.copy} onChange={(e) => setNewMedia({ ...newMedia, copy: e.target.value })} placeholder="Description du contenu..." />
            </label>
          </div>
          <div className="form-row">
            <label>
              URL Iframe
              <input type="url" value={newMedia.url} onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })} placeholder="https://..." />
            </label>
            <label>
              URL miniature
              <input type="url" value={newMedia.thumbnail} onChange={(e) => setNewMedia({ ...newMedia, thumbnail: e.target.value })} placeholder="https://... ou image locale" />
            </label>
            <label>
              Lien de la ressource
              <input type="url" value={newMedia.linkUrl} onChange={(e) => setNewMedia({ ...newMedia, linkUrl: e.target.value })} placeholder="https://..." />
            </label>
            <label>
              Libellé du lien
              <input value={newMedia.linkLabel} onChange={(e) => setNewMedia({ ...newMedia, linkLabel: e.target.value })} placeholder="Découvrir la ressource" />
            </label>
            <label>
              Type de rendu vidéo
              <select value={newMedia.videoDisplayMode} onChange={(e) => setNewMedia({ ...newMedia, videoDisplayMode: e.target.value })}>
                <option value="iframe">Vidéo embarquée (iframe)</option>
                <option value="thumbnail">Miniature cliquable</option>
              </select>
            </label>
          </div>
          <div className="helper-callout">
            <strong>Miniature du média</strong>
            <span>Tu peux renseigner à la fois une URL Iframe et une miniature, mais le public n’affiche qu’un seul aperçu selon le contenu choisi.</span>
          </div>
          <div className="form-row thumbnail-picker-row">
            <div className="thumbnail-picker-box">
              {newMedia.thumbnail ? (
                <img src={newMedia.thumbnail} alt="Miniature sélectionnée" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="thumbnail-empty">Aucune image</div>
              )}
            </div>
            <div className="thumbnail-picker-actions">
              <button type="button" className="btn btn-white" onClick={() => openImageSelector("new")}>Choisir dans la bibliothèque</button>
              <label className="upload-inline-label">
                <span>Téléverser une image</span>
                <input type="file" accept="image/*" onChange={(event) => handleLocalThumbnailUpload(event, "new")} />
              </label>
            </div>
          </div>
          <div className="form-row">
            <label className="admin-check">
              <input type="checkbox" checked={newMedia.published} onChange={(e) => setNewMedia({ ...newMedia, published: e.target.checked })} />
              Publier ce contenu
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={newMedia.archived} onChange={(e) => setNewMedia({ ...newMedia, archived: e.target.checked })} />
              Archiver dans la médiathèque
            </label>
            <button className="btn btn-yellow" type="button" onClick={createNewMedia} disabled={creatingNew}>{creatingNew ? "Création..." : "Créer"}</button>
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
                    <button type="button" className="btn btn-yellow" onClick={() => setNewMedia((current) => ({ ...current, thumbnail: image.url }))}>Utiliser</button>
                    <button type="button" className="btn btn-danger" onClick={() => deleteUploadedImage(image.key)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {paginatedMedia.length === 0 ? (
          <div className="empty-state-card">Aucun élément ne correspond à ce filtre pour le moment.</div>
        ) : paginatedMedia.map((item) => (
          <form className="admin-media" noValidate key={item.key} draggable onDragStart={() => setDraggedKey(item.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderMedia(draggedKey, item.key)} onSubmit={(event) => {
            event.preventDefault();
            updateMedia(item);
          }}>
            <div className="admin-media-heading">
              <span className="media-type-badge">{item.type}</span>
              <strong>{item.key}</strong>
              <span className={item.archived ? "draft-badge" : item.published ? "published-badge" : "draft-badge"}>{item.archived ? "Archivé" : item.published ? "Publié" : "Brouillon"}</span>
            </div>
            <div className="admin-drag-handle" aria-label="Déplacer">⋮⋮</div>
            <label>
              Thème
              <input required value={item.tag} onChange={(event) => changeMedia(item.key, "tag", event.target.value)} />
            </label>
            <label>
              Titre
              <input required value={item.title} onChange={(event) => changeMedia(item.key, "title", event.target.value)} />
            </label>
            <label>
              Ordre
              <input type="number" min="0" value={Number(item.display_order || 0)} onChange={(event) => changeMedia(item.key, "display_order", Number(event.target.value || 0))} />
            </label>
            <label className="wide-field">
              Description
              <textarea required rows="3" value={item.copy} onChange={(event) => changeMedia(item.key, "copy", event.target.value)} />
            </label>
            <label>
              URL Iframe
              <input type="url" value={item.url || ""} onChange={(event) => changeMedia(item.key, "url", event.target.value)} />
            </label>
            <label>
              URL miniature
              <input type="url" value={item.thumbnail || ""} onChange={(event) => changeMedia(item.key, "thumbnail", event.target.value)} />
            </label>
            <label>
              Lien de la ressource
              <input type="url" value={item.linkUrl || ""} onChange={(event) => changeMedia(item.key, "linkUrl", event.target.value)} />
            </label>
            <label>
              Libellé du lien
              <input value={item.linkLabel || ""} onChange={(event) => changeMedia(item.key, "linkLabel", event.target.value)} placeholder="Découvrir la ressource" />
            </label>
            <label>
              Type de rendu vidéo
              <select value={item.videoDisplayMode || "iframe"} onChange={(event) => changeMedia(item.key, "videoDisplayMode", event.target.value)}>
                <option value="iframe">Vidéo embarquée (iframe)</option>
                <option value="thumbnail">Miniature cliquable</option>
              </select>
            </label>
            <div className="helper-callout compact">
              <strong>Miniature du média</strong>
              <span>Le rendu public privilégie l’iframe si elle est renseignée, sinon la miniature.</span>
            </div>
            <div className="form-row thumbnail-picker-row">
              <div className="thumbnail-picker-box">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="Miniature du média" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="thumbnail-empty">Aucune image</div>
                )}
              </div>
              <div className="thumbnail-picker-actions">
                <button type="button" className="btn btn-white" onClick={() => openImageSelector("edit", item.key)}>Choisir dans la bibliothèque</button>
                <label className="upload-inline-label">
                  <span>Téléverser une image</span>
                  <input type="file" accept="image/*" onChange={async (event) => {
                    await handleLocalThumbnailUpload(event, "edit", item.key);
                  }} />
                </label>
              </div>
            </div>
            <div className="admin-inline-actions">
              <label className="admin-check">
                <input type="checkbox" checked={item.published} onChange={(event) => changeMedia(item.key, "published", event.target.checked)} />
                Publier ce contenu
              </label>
              <label className="admin-check">
                <input type="checkbox" checked={Boolean(item.archived)} onChange={(event) => changeMedia(item.key, "archived", event.target.checked)} />
                Archiver
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-yellow" type="submit" disabled={savingMediaKey === item.key}>{savingMediaKey === item.key ? "Enregistrement..." : "Enregistrer le média"}</button>
              <button className="btn btn-danger" type="button" onClick={() => deleteMedia(item.key)} disabled={deletingKey === item.key}>{deletingKey === item.key ? "Suppression..." : "Supprimer"}</button>
            </div>
          </form>
        ))}

        {filteredMedia.length > 0 && (
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
                    <button
                      key={image.key}
                      type="button"
                      className="modal-image-choice"
                      onClick={() => selectImageFromLibrary(image.url)}
                    >
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
