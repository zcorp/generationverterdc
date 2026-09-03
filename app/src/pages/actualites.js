import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import { siteUrl } from "../lib/siteUrl";

const fallbackNews = [
  { key: "campagne-reboisement", category: "Terrain", title: "Exemple d'actualité vidéo", summary: "Un exemple de vidéo YouTube à remplacer par une actualité validée par GV-RDC.", imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80", embedUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ", linkUrl: "#" },
  { key: "atelier-ecole", category: "Éducation", title: "Atelier sur la biodiversité", summary: "Une série de séances pédagogiques conçues pour sensibiliser les élèves à la protection de leur environnement.", imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80", embedUrl: "", linkUrl: "#" },
  { key: "club-environnement", category: "Vie de l'association", title: "Le club environnemental reprend", summary: "Les jeunes s’organisent autour d’actions concrètes pour promouvoir des habitudes plus respectueuses de la nature.", imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80", embedUrl: "", linkUrl: "#" },
];

export default function NewsPage() {
  const [news, setNews] = useState(fallbackNews);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    fetch(siteUrl("/api/public-content"), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((content) => {
        if (content?.news?.length) {
          setNews(content.news);
          setVisibleCount(6);
        }
      })
      .catch(() => undefined);
  }, []);

  const visibleNews = news.slice(0, visibleCount);
  const hasMoreNews = visibleCount < news.length;

  return (
    <PageLayout heroClass="hero-actions" eyebrow="Les nouvelles de GV-RDC" title="Actualités" copy="Les temps forts de nos actions pour éduquer, agir et préserver la biodiversité de la Tshopo.">
      <section className="content-section">
        <div className="section-heading">
          <p className="eyebrow">À suivre</p>
          <h2>Les dernières nouvelles</h2>
          <p>Les publications sont mises à jour depuis l’espace privé et peuvent aussi intégrer des contenus vidéo ou des contenus externes.</p>
        </div>

        <div className="news-grid">
          {visibleNews.map((article) => {
            const safeImage = typeof article.imageUrl === "string" && article.imageUrl.trim().length > 0 ? article.imageUrl.trim() : "";
            const safeEmbed = typeof article.embedUrl === "string" && article.embedUrl.trim().length > 0 ? article.embedUrl.trim() : "";
            const videoDisplayMode = article.videoDisplayMode || "iframe";
            const previewMode = safeEmbed ? "video" : "image";
            const rawLinkTarget = typeof article.linkUrl === "string" ? article.linkUrl.trim() : "";
            const linkTarget = rawLinkTarget.startsWith("http") ? rawLinkTarget : rawLinkTarget || "#";
            const dateLabel = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "À venir";
            const articleLinkIsExternal = typeof linkTarget === "string" && linkTarget.startsWith("http");

            return (
              <article className={`news-card ${previewMode === "video" ? `news-card-video news-card-video--${videoDisplayMode}` : ""}`} key={article.key || article.title}>
                <div className={`news-visual ${previewMode === "video" ? "news-visual--video" : "news-visual--image"}`}>
                  {previewMode === "video" ? (
                    videoDisplayMode === "thumbnail" ? (
                      <a href={safeEmbed} target="_blank" rel="noreferrer" className="video-thumbnail-link">
                        <div className="video-thumbnail" style={safeImage ? { backgroundImage: `url(${safeImage})` } : undefined}>
                          <span className="play-button">▶</span>
                        </div>
                      </a>
                    ) : (
                      <div className="news-media-frame">
                        <iframe src={safeEmbed} title={article.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    )
                  ) : (
                    <div className="news-image" style={safeImage ? { backgroundImage: `url(${safeImage})` } : undefined} aria-label={article.title}>
                      {!safeImage && "✦"}
                    </div>
                  )}
                  <span className="news-visual-tag">{previewMode === "video" ? "Vidéo" : safeImage ? "Photo" : article.category || "Actualité"}</span>
                </div>

                <div className="news-card-body">
                  <p className="news-meta">{article.category || "Actualité"} · {dateLabel}</p>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  {linkTarget && linkTarget !== "#" ? (
                    <a href={linkTarget} target="_blank" rel="noreferrer">
                      {article.linkLabel || "Lire l'article"}
                    </a>
                  ) : (
                    <span className="news-link">À venir</span> 
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {hasMoreNews && (
          <div className="feed-load-more">
            <button type="button" className="btn btn-yellow" onClick={() => setVisibleCount((count) => Math.min(count + 6, news.length))}>
              Voir plus d'actualités
            </button>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
