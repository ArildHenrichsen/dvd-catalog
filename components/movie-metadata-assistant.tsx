"use client";

import { useState } from "react";
import type { MovieSuggestion } from "@/lib/tmdb";

type Metadata = Pick<
  MovieSuggestion,
  | "original_title"
  | "alternative_title"
  | "release_year"
  | "imdb_url"
  | "imdb_score"
  | "overview"
> & {
  metadata_provider?: string | null;
  metadata_provider_id?: string | null;
};

type ImportedCover = {
  path: string;
  thumbnailPath?: string;
  url: string;
};

type BusyState =
  | "visual"
  | "search"
  | "poster"
  | "rating"
  | null;

export function MovieMetadataAssistant({
  coverFile,
  initialQuery,
  existingReleaseId,
  onApply,
}: {
  coverFile: File | null;
  initialQuery?: string;
  existingReleaseId?: string;
  onApply: (
    metadata: Metadata,
    importedCover?: ImportedCover,
  ) => void;
}) {
  const [query, setQuery] = useState(
    initialQuery ?? "",
  );

  const [results, setResults] = useState<
    MovieSuggestion[]
  >([]);

  const [busy, setBusy] =
    useState<BusyState>(null);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function searchMovies(
    searchQuery = query,
  ) {
    const normalized = searchQuery
      .trim()
      .replace(/\s+/g, " ");

    if (normalized.length < 2) {
      setError("Skriv minst to tegn før du søker.");
      return;
    }

    setBusy("search");
    setError("");
    setStatus("Søker etter mulige filmer …");

    try {
      const response = await fetch(
        `/api/movies/search?q=${encodeURIComponent(
          normalized,
        )}`,
      );

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.error || "Filmsøket feilet",
        );
      }

      const movieResults = Array.isArray(
        json?.results,
      )
        ? json.results
        : [];

      setResults(movieResults);

      setStatus(
        movieResults.length
          ? "Velg riktig film under."
          : "Ingen treff. Juster søketeksten.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Filmsøket feilet",
      );

      setStatus("");
    } finally {
      setBusy(null);
    }
  }

  async function analyzeCover() {
    if (!coverFile && !existingReleaseId) {
      setError(
        "Ta eller last opp et coverbilde først.",
      );
      return;
    }

    setBusy("visual");
    setError("");
    setStatus(
      "Sammenligner coveret med bilder på nettet …",
    );

    try {
      const body = new FormData();

      if (coverFile) {
        body.append("file", coverFile);
      } else if (existingReleaseId) {
        body.append(
          "releaseId",
          existingReleaseId,
        );
      }

      const response = await fetch(
        "/api/movies/analyze-cover",
        {
          method: "POST",
          body,
        },
      );

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.error || "Coveranalysen feilet",
        );
      }

      const detectedQueries = Array.isArray(
        json?.detectedQueries,
      )
        ? json.detectedQueries.filter(
            (
              value: unknown,
            ): value is string =>
              typeof value === "string",
          )
        : [];

      const movieResults = Array.isArray(
        json?.results,
      )
        ? json.results
        : [];

      setResults(movieResults);

      if (detectedQueries[0]) {
        setQuery(detectedQueries[0]);
      }

      setStatus(
        movieResults.length
          ? "Fant mulige visuelle treff. Velg riktig film under."
          : "Fant ingen sikre treff. Prøv manuelt filmsøk.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Coveranalysen feilet",
      );

      setStatus("");
    } finally {
      setBusy(null);
    }
  }

  async function fetchImdbScore(
    movie: MovieSuggestion,
  ): Promise<number | null> {
    if (
      movie.imdb_score != null &&
      movie.imdb_score > 0
    ) {
      return movie.imdb_score;
    }

    if (!movie.imdb_url) {
      return null;
    }

    try {
      const response = await fetch(
        "/api/imdb-ratings/lookup",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            imdbUrl: movie.imdb_url,
          }),
        },
      );

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        return null;
      }

      return typeof json?.imdbScore === "number"
        ? json.imdbScore
        : null;
    } catch {
      return null;
    }
  }

  async function importPoster(
    movie: MovieSuggestion,
  ): Promise<ImportedCover | undefined> {
    if (!movie.poster_url) {
      return undefined;
    }

    const shouldImportCover = window.confirm(
      `Vil du bruke coverbildet fra treffet for «${movie.original_title}» som lagret coverbilde?`,
    );

    if (!shouldImportCover) {
      return undefined;
    }

    setBusy("poster");
    setError("");
    setStatus(
      "Henter coverbildet fra TMDB …",
    );

    const response = await fetch(
      "/api/movies/import-poster",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          posterUrl: movie.poster_url,
        }),
      },
    );

    const json = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        json?.error ||
          "Coverbildet kunne ikke importeres",
      );
    }

    if (!json?.path || !json?.url) {
      throw new Error(
        "Serveren returnerte ikke gyldig coverinformasjon.",
      );
    }

    return {
      path: json.path,
      thumbnailPath:
        json.thumbnailPath || undefined,
      url: json.url,
    };
  }

  async function applyMovie(
    movie: MovieSuggestion,
  ) {
    setError("");

    try {
      let importedCover:
        | ImportedCover
        | undefined;

      if (movie.poster_url) {
        importedCover =
          await importPoster(movie);
      }

      setBusy("rating");
      setStatus(
        "Henter IMDb-score og fyller ut metadata …",
      );

      const fetchedScore =
        await fetchImdbScore(movie);

      const metadata: Metadata = {
        original_title:
          movie.original_title,
        alternative_title:
          movie.alternative_title,
        release_year: movie.release_year,
        imdb_url: movie.imdb_url,
        imdb_score:
          fetchedScore ??
          movie.imdb_score ??
          null,
        overview: movie.overview,
        metadata_provider: "tmdb",
        metadata_provider_id: String(
          movie.tmdb_id,
        ),
      };

      onApply(metadata, importedCover);

      setResults([]);

      setStatus(
        importedCover
          ? `Metadata og cover fra «${movie.original_title}» er lagt inn i skjemaet.`
          : `Metadata fra «${movie.original_title}» er lagt inn i skjemaet.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Filmdata kunne ikke legges inn",
      );

      setStatus("");
    } finally {
      setBusy(null);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setStatus("");
    setError("");
  }

  return (
    <section
      className="metadata-assistant"
      aria-labelledby="metadata-assistant-title"
    >
      <div className="metadata-assistant-heading">
        <strong id="metadata-assistant-title">
          Søk etter filmen
        </strong>
      </div>

      <div className="metadata-assistant-actions">
        <button
          type="button"
          onClick={() => void analyzeCover()}
          disabled={
            (!coverFile && !existingReleaseId) ||
            busy !== null
          }
        >
          {busy === "visual"
            ? "Sammenligner …"
            : "Finn film fra coverbilde"}
        </button>

        <div className="metadata-search-row">
          <div className="metadata-search-input-wrap">
            <input
              aria-label="Søk etter film"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Søk manuelt på tittel"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchMovies();
                }
              }}
            />

            {query && (
              <button
                type="button"
                className="metadata-search-clear"
                aria-label="Tøm tittelsøket"
                title="Tøm søkefeltet"
                onClick={clearSearch}
                disabled={busy !== null}
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void searchMovies()}
            disabled={busy !== null}
          >
            {busy === "search"
              ? "Søker …"
              : "Søk"}
          </button>
        </div>
      </div>

      {!coverFile && !existingReleaseId && (
        <p className="assistant-status">
          Velg et cover øverst før du bruker
          visuell matching.
        </p>
      )}

      {!coverFile && existingReleaseId && (
        <p className="assistant-status">
          Det lagrede coveret brukes hvis du ikke
          velger et nytt bilde.
        </p>
      )}

      {status && (
        <p
          className="assistant-status"
          aria-live="polite"
        >
          {status}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="movie-results">
          {results.map((movie) => (
            <article
              className="movie-result"
              key={movie.tmdb_id}
            >
              <div className="movie-result-poster">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt=""
                  />
                ) : (
                  <span>Ingen plakat</span>
                )}
              </div>

              <div className="movie-result-copy">
                <strong>
                  {movie.original_title}
                </strong>

                <small>
                  {movie.release_year ??
                    "Ukjent år"}
                </small>
              </div>

              <button
                type="button"
                className="primary"
                disabled={busy !== null}
                onClick={() =>
                  void applyMovie(movie)
                }
              >
                {busy === "poster"
                  ? "Henter cover …"
                  : busy === "rating"
                    ? "Henter metadata …"
                    : "Bruk"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}