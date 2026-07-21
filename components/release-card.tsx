import Link from "next/link";
import type { Release } from "@/lib/types";

export function ReleaseCard({ release }: { release: Release }) {
  return (
    <Link className="card" href={`/releases/${release.id}`}>
      <div className="cover">
        {release.cover_url ? (
          <img
            src={release.cover_url}
            alt={`Cover: ${release.original_title}`}
            loading="lazy"
          />
        ) : (
          <span className="cover-placeholder muted">
            <strong aria-hidden="true">▣</strong>
            <span>Mangler cover</span>
          </span>
        )}
      </div>
      <div className="card-body">
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
