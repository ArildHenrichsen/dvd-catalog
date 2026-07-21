import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelease } from "@/lib/releases";
import { ReleaseActions } from "@/components/release-actions";

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRelease(id);
  if (!r) notFound();

  return (
    <article className="detail">
      <Link className="back-link" href={r.is_wishlist ? "/wishlist" : "/"}>
        ← Tilbake til {r.is_wishlist ? "ønskelisten" : "samlingen"}
      </Link>
      <div className="header-row">
        <div>
          {r.is_wishlist && <span className="wishlist-badge">♡ På ønskelisten</span>}
          <h1>{r.original_title}</h1>
          {r.alternative_title && <p className="muted">{r.alternative_title}</p>}
        </div>
        <ReleaseActions release={r} />
      </div>
      <div className="two-col">
        <div className="cover detail-cover">
          {r.cover_url ? (
            <img src={r.cover_url} alt={`Cover: ${r.original_title}`} />
          ) : (
            <span className="muted">Mangler cover</span>
          )}
        </div>
        <dl className="panel">
          <dt>Status</dt>
          <dd>{r.is_wishlist ? "På ønskelisten" : "I samlingen"}</dd>
          <dt>År</dt><dd>{r.release_year ?? "–"}</dd>
          <dt>IMDb-score</dt><dd>{r.imdb_score?.toFixed(1) ?? "–"}</dd>
          <dt>IMDb-link</dt><dd>{r.imdb_url ? <a href={r.imdb_url} target="_blank" rel="noreferrer">Åpne på IMDb ↗</a> : "–"}</dd>
          <dt>Region</dt><dd>{r.region ?? "–"}</dd>
          <dt>Utgave</dt><dd>{r.edition ?? "–"}</dd>
          <dt>Merknad</dt><dd style={{ whiteSpace: "pre-wrap" }}>{r.notes ?? "–"}</dd>
          <dt>Registrert</dt><dd>{new Date(r.created_at).toLocaleString("nb-NO")}</dd>
        </dl>
      </div>
    </article>
  );
}
