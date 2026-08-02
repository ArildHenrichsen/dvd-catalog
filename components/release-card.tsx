import Link from "next/link";
import type { Release } from "@/lib/types";

export function ReleaseCard({ release }: { release: Release }) {
  const src = release.cover_url || release.thumbnail_url || "";
  const srcSet = release.thumbnail_url && release.cover_url ? `${release.thumbnail_url} 320w, ${release.cover_url} 1600w` : undefined;

  return (
    <Link className="card" href={`/releases/${release.id}`}>
      <div className="cover">
        {(release.thumbnail_url || release.cover_url) ? (
          <img
            src={src}
            srcSet={srcSet}
            sizes="(max-width: 600px) 320px, 1600px"
            alt={`Cover: ${release.original_title}`}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span className="cover-placeholder muted">
            <strong aria-hidden="true">▣</strong>
            <span>Mangler cover</span>
          </span>
        )}
      </div>
      <div className="card-body">
        {release.is_wishlist ? (
          <span className="wishlist-card-label">♡ Ønskeliste</span>
        ) : (
          <span className="collection-status-badge">▦ Samling</span>
        )}
        <h2>{release.original_title}</h2>
        {release.alternative_title && (
          <span className="muted card-subtitle">{release.alternative_title}</span>
        )}
        <div className="card-meta">
          <span className="year-chip">{release.release_year ?? "Ukjent år"}</span>
          <span className="score-chip">IMDb {release.imdb_score?.toFixed(1) ?? "–"}</span>
        </div>
      </div>
    </Link>
  );
}
