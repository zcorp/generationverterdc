import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { media as fallbackMedia } from "../data/publicContent";
import { siteUrl } from "../lib/siteUrl";

export default function MediaPage() {
  const [media, setMedia] = useState(fallbackMedia);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    fetch(siteUrl("/api/public-content"), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.media?.length) {
          setMedia(content.media);
          setVisibleCount(6);
        }
      })
      .catch(() => undefined);
  }, []);

  const visibleMedia = media.slice(0, visibleCount);
  const hasMoreMedia = visibleCount < media.length;

  return <PageLayout heroClass="hero-impact" eyebrow="Ressources" title="Espace médias" copy="Des capsules courtes et des ressources pour apprendre, observer et agir au quotidien.">
    <section className="content-section">
      <p className="eyebrow">À regarder et à partager</p>
      <h2>Capsules éducatives</h2>
      <div className="media-grid">
        {visibleMedia.map((item) => {
          const safeEmbed = typeof item.embedUrl === "string" && item.embedUrl.trim().length > 0 ? item.embedUrl.trim() : "";
          const safeThumbnail = typeof item.thumbnail === "string" && item.thumbnail.trim() && /^https?:|^data:image\//i.test(item.thumbnail.trim()) ? item.thumbnail.trim() : "";
          const videoDisplayMode = item.videoDisplayMode || "iframe";
          const previewMode = safeEmbed ? "video" : "image";
          const cardTag = item.tag || (item.type === "video" ? "Vidéo" : "Ressource");

          return (
            <article className={`media-card ${previewMode === "video" ? `media-card-video media-card-video--${videoDisplayMode}` : ""}`} key={item.key || item.title}>
              <div className={`media-preview ${previewMode === "video" ? "media-preview--video" : "media-preview--image"}`}>
                {previewMode === "video" ? (
                  videoDisplayMode === "thumbnail" ? (
                    <a href={safeEmbed} target="_blank" rel="noreferrer" className="video-thumbnail-link">
                      <div className="video-thumbnail" style={safeThumbnail ? { backgroundImage: `url(${safeThumbnail})` } : undefined}>
                        <span className="play-button">▶</span>
                      </div>
                    </a>
                  ) : (
                    <div className="news-media-frame">
                      <iframe src={safeEmbed} title={item.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  )
                ) : safeThumbnail ? (
                  <>
                    <div className="media-image" style={{ backgroundImage: `url(${safeThumbnail})` }} />
                    {item.type === "video" && <div className="play-badge"><span aria-hidden="true">▶</span></div>}
                  </>
                ) : (
                  <div className="media-placeholder"><span>✦</span><small>{item.type === "video" ? "Vidéo à intégrer" : "Ressource GV-RDC"}</small></div>
                )}
                <span className="media-tag">{cardTag}</span>
              </div>
              <div className="media-card-body">
                <span className="media-meta">{item.type === "video" ? "Vidéo" : "Ressource"}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                {item.linkUrl ? <a href={item.linkUrl} target="_blank" rel="noreferrer">{item.linkLabel || "Découvrir la ressource"}</a> : <span className="media-link-placeholder">{item.linkLabel || "Découvrir la ressource"}</span>}
              </div>
            </article>
          );
        })}
      </div>
      {hasMoreMedia && (
        <div className="feed-load-more">
          <button type="button" className="btn btn-yellow" onClick={() => setVisibleCount((count) => Math.min(count + 6, media.length))}>
            Voir plus de médias
          </button>
        </div>
      )}
    </section>
    <section className="strip topics">
      <p className="eyebrow">Explorer par thème</p>
      <div><a href="#">Biodiversité</a><a href="#">Déchets</a><a href="#">Eau</a><a href="#">Reboisement</a><a href="#">Climat</a></div>
    </section>
  </PageLayout>;
}
