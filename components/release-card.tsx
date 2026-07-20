import Link from "next/link";
import type { Release } from "@/lib/types";

export function ReleaseCard({ release }: { release: Release }) {
  return <Link className="card" href={`/releases/${release.id}`}>
    <div className="cover">{release.cover_url ? <img src={release.cover_url} alt={`Cover: ${release.original_title}`} loading="lazy" /> : <span className="muted">Mangler cover</span>}</div>
    <div className="card-body"><h2>{release.original_title}</h2>{release.alternative_title && <span className="muted">{release.alternative_title}</span>}<span>{release.release_year ?? "Ukjent år"}</span><span className="score">IMDb {release.imdb_score?.toFixed(1) ?? "–"}</span></div>
  </Link>;
}
