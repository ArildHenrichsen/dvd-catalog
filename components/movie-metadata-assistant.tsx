"use client";

import { useState } from "react";

type MovieSuggestion = {
  tmdb_id: number;
  original_title: string;
  alternative_title: string | null;
  release_year: number | null;
  poster_url: string | null;
  overview: string | null;
};

type Metadata = Pick<MovieSuggestion, "original_title" | "alternative_title" | "release_year">;

export function MovieMetadataAssistant({
  coverFile,
  initialQuery,
  onApply,
}: {
  coverFile: File | null;
  initialQuery?: string;
  onApply: (metadata: Metadata) => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<MovieSuggestion[]>([]);
  const [busy, setBusy] = useState<"ocr" | "search" | null>(null);
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
    if (!coverFile) {
      setError("Last opp eller ta et coverbilde først.");
      return;
    }

    setBusy("ocr");
    setError("");
    setStatus("Leser tekst fra coveret. Dette kan ta litt tid første gang …");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng+nor");
      const result = await worker.recognize(coverFile);
      await worker.terminate();

      const candidate = result.data.text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length >= 2)
        .sort((a, b) => b.length - a.length)
        .slice(0, 3)
        .join(" ")
        .replace(/[^\p{L}\p{N}:&'’\- ]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);

      if (!candidate) throw new Error("Fant ingen tydelig tittel i coverbildet.");
      setQuery(candidate);
      setStatus(`Fant tekstforslag: «${candidate}»`);
      await searchMovies(candidate);
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
          <strong id="metadata-assistant-title">Fyll ut fra filmdata</strong>
          <small>Analyser coveret eller søk manuelt. Du godkjenner alltid resultatet.</small>
        </div>
        <span className="tmdb-credit">Filmdata fra TMDB</span>
      </div>

      <div className="metadata-assistant-actions">
        <button type="button" onClick={analyzeCover} disabled={!coverFile || busy !== null}>
          {busy === "ocr" ? "Analyserer …" : "Analyser cover"}
        </button>
        <div className="metadata-search-row">
          <input
            aria-label="Søk etter film"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Søk på tittel"
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
                {movie.overview && <p>{movie.overview}</p>}
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onApply(movie);
                  setStatus(`Metadata fra «${movie.original_title}» er lagt inn i skjemaet.`);
                }}
              >
                Bruk
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
