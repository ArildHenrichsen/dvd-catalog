"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MovieSuggestion } from "@/lib/tmdb";
import type { Release } from "@/lib/types";


const QUICK_CHECK_SESSION_KEY = "dvd-quick-check-image";

function dataUrlToFile(dataUrl: string): File {
  const [header, encoded] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const bytes = atob(encoded);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
  return new File([buffer], `quick-check-${Date.now()}.jpg`, { type: mime });
}

type MatchRelease = Pick<Release, "id" | "original_title" | "alternative_title" | "release_year" | "is_wishlist" | "cover_url">;

export function QuickCheck() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [selected, setSelected] = useState<MovieSuggestion | null>(null);
  const [matches, setMatches] = useState<MatchRelease[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const restoredImage = useRef(false);

  useEffect(() => {
    if (restoredImage.current) return;
    restoredImage.current = true;
    const stored = sessionStorage.getItem(QUICK_CHECK_SESSION_KEY);
    if (!stored) return;
    sessionStorage.removeItem(QUICK_CHECK_SESSION_KEY);
    try {
      const restoredFile = dataUrlToFile(stored);
      setFile(restoredFile);
      setPreview(stored);
      void analyze(restoredFile);
    } catch {
      setError("Kamerabildet kunne ikke klargjøres. Ta bildet på nytt.");
    }
  }, []);

  function reset() {
    setFile(null);
    setPreview("");
    setSuggestions([]);
    setSelected(null);
    setMatches([]);
    setStatus("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze(chosenFile: File) {
    setBusy(true);
    setError("");
    setStatus("Analyserer coveret …");
    setSuggestions([]);
    setSelected(null);
    setMatches([]);
    try {
      const body = new FormData();
      body.append("file", chosenFile);
      const response = await fetch("/api/movies/analyze-cover", { method: "POST", body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Coveranalysen feilet");
      const results = (json.results ?? []) as MovieSuggestion[];
      setSuggestions(results);
      setStatus(results.length ? "Velg filmen som passer coveret." : "Ingen filmforslag funnet. Du kan fortsette som ny DVD.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coveranalysen feilet");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function checkExisting(movie: MovieSuggestion) {
    setSelected(movie);
    setBusy(true);
    setError("");
    setStatus("Sjekker samlingen og ønskelisten …");
    try {
      const response = await fetch("/api/releases/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(movie),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunne ikke kontrollere samlingen");
      const found = (json.matches ?? []) as MatchRelease[];
      setMatches(found);
      setStatus(found.length ? `Fant ${found.length} mulig eksisterende oppføring${found.length === 1 ? "" : "er"}.` : "Filmen ser ikke ut til å finnes i samlingen eller ønskelisten.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kontrollen feilet");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function continueAsNew() {
    if (!file) return;
    setBusy(true);
    setError("");
    setStatus("Lagrer bildet og åpner ny DVD …");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Bildet kunne ikke lastes opp");
      const params = new URLSearchParams({ coverPath: json.path });
      if (json.thumbnailPath) params.set("thumbnailPath", json.thumbnailPath);
      if (selected) {
        params.set("originalTitle", selected.original_title);
        if (selected.alternative_title) params.set("alternativeTitle", selected.alternative_title);
        if (selected.release_year) params.set("releaseYear", String(selected.release_year));
        if (selected.imdb_url) params.set("imdbUrl", selected.imdb_url);
        if (selected.imdb_score && selected.imdb_score > 0) params.set("imdbScore", String(selected.imdb_score));
      }
      router.push(`/releases/new?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke fortsette");
      setStatus("");
      setBusy(false);
    }
  }

  return (
    <section className="quick-check panel">
      <div className="quick-check-intro">
        <span className="quick-check-icon" aria-hidden="true">⌾</span>
        <div>
          <h1>Sjekk et cover</h1>
          <p className="muted">Ta et bilde i butikken og sjekk om filmen allerede finnes i samlingen eller ønskelisten.</p>
        </div>
      </div>

      {!file && (
        <label className="camera-upload-button primary button">
          <span aria-hidden="true">📷</span>
          Ta bilde av cover
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            onChange={event => {
              const chosen = event.target.files?.[0];
              if (!chosen) return;
              setFile(chosen);
              setPreview(URL.createObjectURL(chosen));
              void analyze(chosen);
            }}
          />
        </label>
      )}

      {preview && <div className="quick-check-preview"><img src={preview} alt="Cover som kontrolleres" /></div>}
      {status && <p className="assistant-status" aria-live="polite">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {suggestions.length > 0 && !selected && (
        <div className="movie-results">
          {suggestions.map(movie => (
            <article className="movie-result" key={movie.tmdb_id}>
              <div className="movie-result-poster">{movie.poster_url ? <img src={movie.poster_url} alt="" /> : <span>Ingen plakat</span>}</div>
              <div className="movie-result-copy">
                <strong>{movie.original_title}</strong>
                {movie.alternative_title && <span>{movie.alternative_title}</span>}
                <small>{movie.release_year ?? "Ukjent år"}</small>
              </div>
              <button type="button" className="primary" disabled={busy} onClick={() => void checkExisting(movie)}>Sjekk denne</button>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="quick-check-result">
          <h2>{selected.original_title}{selected.release_year ? ` (${selected.release_year})` : ""}</h2>
          {matches.length > 0 ? (
            <div className="existing-match-list">
              {matches.map(match => (
                <article className="existing-match" key={match.id}>
                  <div className="existing-match-cover">{match.cover_url ? <img src={match.cover_url} alt="" /> : <span>Ingen cover</span>}</div>
                  <div>
                    <strong>{match.original_title}</strong>
                    {match.alternative_title && <p>{match.alternative_title}</p>}
                    <small>{match.is_wishlist ? "På ønskelisten" : "I samlingen"}{match.release_year ? ` · ${match.release_year}` : ""}</small>
                  </div>
                  <button type="button" className="primary" onClick={() => router.push(`/releases/${match.id}/edit`)}>Rediger treff</button>
                </article>
              ))}
            </div>
          ) : (
            <p>Ingen eksisterende DVD matchet denne filmen.</p>
          )}
          <div className="actions quick-check-actions">
            <button type="button" onClick={reset}>Forkast bildet</button>
            <button type="button" className="primary" disabled={busy} onClick={() => void continueAsNew()}>Fortsett som ny DVD</button>
          </div>
        </div>
      )}

      {file && suggestions.length === 0 && !busy && !selected && (
        <div className="actions quick-check-actions">
          <button type="button" onClick={reset}>Forkast bildet</button>
          <button type="button" className="primary" onClick={() => void continueAsNew()}>Fortsett som ny DVD</button>
        </div>
      )}
    </section>
  );
}
