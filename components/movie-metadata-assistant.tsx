"use client";

import { useState } from "react";
import type { MovieSuggestion } from "@/lib/tmdb";

type Metadata = Pick<
  MovieSuggestion,
  "original_title" | "alternative_title" | "release_year" | "imdb_url" | "imdb_score"
>;

export function MovieMetadataAssistant({
  coverFile,
  initialQuery,
  existingReleaseId,
  onApply,
}: {
  coverFile: File | null;
  initialQuery?: string;
  existingReleaseId?: string;
  onApply: (metadata: Metadata, importedCover?: { path: string; url: string }) => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<MovieSuggestion[]>([]);
  const [busy, setBusy] = useState<"visual" | "search" | "poster" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function searchMovies(searchQuery = query) {
    const normalized = searchQuery.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) {
      setError("Skriv minst to tegn før du søker.");
      return;
    }

    setBusy("search");
    setError("");
    setStatus("Søker etter mulige filmer …");

    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(normalized)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Filmsøket feilet");
      setResults(json.results ?? []);
      setStatus(json.results?.length ? "Velg riktig film under." : "Ingen treff. Juster søketeksten.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filmsøket feilet");
      setStatus("");
    } finally {
      setBusy(null);
    }
  }

  async function analyzeCover() {
    if (!coverFile && !existingReleaseId) {
      setError("Ta eller last opp et coverbilde først.");
      return;
    }

    setBusy("visual");
    setError("");
    setStatus("Sammenligner coveret med bilder på nettet …");

    try {
      const body = new FormData();
      if (coverFile) {
        body.append("file", coverFile);
      } else if (existingReleaseId) {
        body.append("releaseId", existingReleaseId);
      }

      const response = await fetch("/api/movies/analyze-cover", {
        method: "POST",
        body,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Coveranalysen feilet");

      const detectedQueries = Array.isArray(json.detectedQueries)
        ? json.detectedQueries.filter((value: unknown): value is string => typeof value === "string")
        : [];

      setResults(json.results ?? []);
      if (detectedQueries[0]) setQuery(detectedQueries[0]);
      setStatus(
        json.results?.length
          ? "Fant mulige visuelle treff. Velg riktig film under."
          : "Fant ingen sikre treff. Prøv manuelt filmsøk.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coveranalysen feilet");
      setStatus("");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="metadata-assistant" aria-labelledby="metadata-assistant-title">
      <div className="metadata-assistant-heading">
        <div>
          <strong id="metadata-assistant-title">Finn film fra cover</strong>
          <small>Visuell matching foreslår filmer. Du godkjenner alltid resultatet.</small>
        </div>
        <span className="tmdb-credit">Filmdata fra TMDB</span>
      </div>

      <div className="metadata-assistant-actions">
        <button
          type="button"
          onClick={analyzeCover}
          disabled={(!coverFile && !existingReleaseId) || busy !== null}
        >
          {busy === "visual" ? "Sammenligner …" : "Finn filmen fra coveret"}
        </button>
        <div className="metadata-search-row">
          <input
            aria-label="Søk etter film"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Eller søk manuelt på tittel"
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchMovies();
              }
            }}
          />
          <button type="button" onClick={() => void searchMovies()} disabled={busy !== null}>
            {busy === "search" ? "Søker …" : "Søk"}
          </button>
        </div>
      </div>

      {!coverFile && !existingReleaseId && (
        <p className="assistant-status">Velg et cover øverst før du bruker visuell matching.</p>
      )}
      {!coverFile && existingReleaseId && (
        <p className="assistant-status">Det lagrede coveret brukes hvis du ikke velger et nytt bilde.</p>
      )}
      {status && <p className="assistant-status" aria-live="polite">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {results.length > 0 && (
        <div className="movie-results">
          {results.map(movie => (
            <article className="movie-result" key={movie.tmdb_id}>
              <div className="movie-result-poster">
                {movie.poster_url ? <img src={movie.poster_url} alt="" /> : <span>Ingen plakat</span>}
              </div>
              <div className="movie-result-copy">
                <strong>{movie.original_title}</strong>
                {movie.alternative_title && <span>{movie.alternative_title}</span>}
                <small>{movie.release_year ?? "Ukjent år"}</small>
                {movie.imdb_score != null && movie.imdb_score > 0 && (
                  <small>IMDb {movie.imdb_score.toFixed(1)}</small>
                )}
                {movie.imdb_url && <a href={movie.imdb_url} target="_blank" rel="noreferrer">Åpne IMDb ↗</a>}
                {movie.match_reason && <small className="match-reason">{movie.match_reason}</small>}
                {movie.overview && <p>{movie.overview}</p>}
              </div>
              <button
                type="button"
                className="primary"
                disabled={busy !== null}
                onClick={async () => {
                  let importedCover: { path: string; url: string } | undefined;

                  if (movie.poster_url) {
                    const shouldImportCover = window.confirm(
                      `Vil du også bruke coverbildet fra TMDB for «${movie.original_title}»?`,
                    );

                    if (shouldImportCover) {
                      setBusy("poster");
                      setError("");
                      setStatus("Henter coverbildet fra TMDB …");

                      try {
                        const response = await fetch("/api/movies/import-poster", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ posterUrl: movie.poster_url }),
                        });
                        const json = await response.json();
                        if (!response.ok) {
                          throw new Error(json.error || "Coverbildet kunne ikke importeres");
                        }
                        importedCover = { path: json.path, url: json.url };
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Coverbildet kunne ikke importeres",
                        );
                        setStatus("");
                        setBusy(null);
                        return;
                      }
                    }
                  }

                  onApply(movie, importedCover);
                  setResults([]);
                  setStatus(
                    importedCover
                      ? `Metadata og cover fra «${movie.original_title}» er lagt inn i skjemaet.`
                      : `Metadata fra «${movie.original_title}» er lagt inn i skjemaet.`,
                  );
                  setBusy(null);
                }}
              >
                {busy === "poster" ? "Henter cover …" : "Bruk"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
