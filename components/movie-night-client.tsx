"use client";

import { useCallback, useMemo, useState } from "react";
import type { Release } from "@/lib/types";
import { ReleaseCard } from "@/components/release-card";

type ApiFilm = {
  release: Release;
  reason: string;
};

type ApiSuccess = {
  success: true;
  theme: {
    id: string;
    title: string;
    description: string;
    source: string;
  };
  films: ApiFilm[];
  totalMatches: number;
  extras?: Release[];
};

type ApiNoMatch = { success: false; message: string };

export default function MovieNightClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiSuccess | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/movie-night/generate");
      const payload = (await res.json()) as ApiSuccess | ApiNoMatch;
      if (!payload) {
        setError("Uventet svar fra serveren.");
      } else if (!payload.success) {
        setError(payload.message ?? "Ingen passende temaer funnet.");
      } else {
        setResult(payload);
      }
    } catch (e) {
      console.error(e);
      setError("Kunne ikke generere tema — prøv igjen senere.");
    } finally {
      setLoading(false);
    }
  }, []);

  const pickTwoOther = useCallback(() => {
    if (!result) return;
    const all = result.extras ?? [];
    // If extras length < 2, try re-generating
    if (all.length < 2) {
      // shuffle existing matches (not ideal) — ask user to regenerate
      setError("Færre enn to ekstra treff tilgjengelig. Prøv 'Nytt tema' i stedet.");
      return;
    }
    // pick two random extras
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 2);
    const films: ApiFilm[] = chosen.map(r => ({
      release: r,
      reason: "Valgt fra flere treff for temaet",
    }));
    setResult({ ...result, films, totalMatches: result.totalMatches });
  }, [result]);

  const showAllMatches = useCallback(() => {
    if (!result) return;
    alert(
      `Totalt ${result.totalMatches} treff for temaet "${result.theme.title}".\n` +
        `Visning av alle treff er foreløpig minimal — bruk API direkte for full liste.`,
    );
  }, [result]);

  const content = useMemo(() => {
    if (loading) return <p className="muted">Laster…</p>;
    if (error) return <div className="error">{error}</div>;
    if (!result)
      return (
        <>
          <p>Trykk på knappen for å generere en filmkveld basert på samlingen din.</p>
          <button className="button primary" onClick={generate}>
            Generer filmkveld
          </button>
        </>
      );

    return (
      <div>
        <section className="theme">
          <h1>{result.theme.title}</h1>
          <p className="muted">{result.theme.description}</p>
          <div className="actions" style={{ marginTop: "1rem" }}>
            <button className="button" onClick={generate} disabled={loading}>
              Nytt tema
            </button>{" "}
            <button
              className="button"
              onClick={pickTwoOther}
              disabled={!(result.extras && result.extras.length >= 2)}
            >
              Velg to andre filmer
            </button>{" "}
            <button className="button" onClick={showAllMatches}>
              Vis alle treff ({result.totalMatches})
            </button>
          </div>
        </section>

        <section className="film-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
          {result.films.map(f => (
            <article key={f.release.id} className="film-suggestion">
              <ReleaseCard release={f.release} />
              <p className="muted small" style={{ marginTop: "0.5rem" }}>
                {f.reason}
              </p>
            </article>
          ))}
        </section>

        {result.extras && result.extras.length > 2 && (
          <details style={{ marginTop: "1rem" }}>
            <summary>Flere treff ({result.extras.length})</summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.5rem", marginTop: "0.5rem" }}>
              {result.extras.map(r => (
                <div key={r.id} className="card small">
                  <div className="cover" style={{ height: 120 }}>
                    {r.thumbnail_url || r.cover_url ? (
                      <img src={r.thumbnail_url || r.cover_url || ""} alt={`Cover: ${r.original_title}`} style={{ height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="cover-placeholder muted">▣</div>
                    )}
                  </div>
                  <div style={{ padding: "0.5rem" }}>
                    <strong>{r.original_title}</strong>
                    <div className="muted small">{r.release_year ?? "Ukjent år"}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }, [loading, error, result, generate, pickTwoOther, showAllMatches]);

  return (
    <div className="movie-night container" style={{ padding: "1rem 0" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Hva skal vi se?</h2>
          <p className="muted">Trykk «Generer filmkveld» for et tilfeldig tema og to filmer fra samlingen.</p>
        </div>
        <div>{loading ? <span className="muted">Laster…</span> : null}</div>
      </header>

      <main style={{ marginTop: "1rem" }}>{content}</main>
    </div>
  );
}