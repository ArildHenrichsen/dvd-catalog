"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Release } from "@/lib/types";
import { MovieMetadataAssistant } from "@/components/movie-metadata-assistant";

export function ReleaseForm({ release, initial }: { release?: Release; initial?: Release }) {
  const defaults = release || initial;
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [coverPath, setCoverPath] = useState(defaults?.cover_path || "");
  const [preview, setPreview] = useState(defaults?.cover_url || "");
  const [isWishlist, setIsWishlist] = useState(defaults?.is_wishlist ?? false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [originalTitle, setOriginalTitle] = useState(defaults?.original_title || "");
  const [alternativeTitle, setAlternativeTitle] = useState(defaults?.alternative_title || "");
  const [releaseYear, setReleaseYear] = useState(defaults?.release_year?.toString() || "");
  const [imdbScore, setImdbScore] = useState(defaults?.imdb_score?.toString() || "");
  const [imdbUrl, setImdbUrl] = useState(defaults?.imdb_url || "");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) throw new Error(json.error || "Opplasting feilet");
    setCoverPath(json.path);
    setPreview(json.url);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    payload.cover_path = coverPath;
    payload.is_wishlist = String(isWishlist);

    const url = release ? `/api/releases/${release.id}` : "/api/releases";
    const res = await fetch(url, {
      method: release ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error || "Lagring feilet");

    router.push(`/releases/${json.id}`);
    router.refresh();
  }

  return (
    <form className="form panel" onSubmit={submit}>
      {error && <p className="error" role="alert">{error}</p>}

      <section className="cover-first-field" aria-labelledby="cover-field-title">
        <div className="cover-field-heading">
          <div>
            <strong id="cover-field-title">Coverbilde</strong>
            <small>Ta et bilde eller last opp et eksisterende cover.</small>
          </div>
        </div>
        <label className="cover-file-label">
          <span>Ta bilde / last opp</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={async event => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setCoverFile(file);
                setPreview(URL.createObjectURL(file));
                await upload(file);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Feil");
              }
            }}
          />
        </label>
        {preview && (
          <div className="cover detail-cover cover-form-preview">
            <img src={preview} alt="Forhåndsvisning av cover" />
          </div>
        )}
      </section>

      <MovieMetadataAssistant
        coverFile={coverFile}
        existingReleaseId={release?.id}
        initialQuery={originalTitle}
        onApply={metadata => {
          setOriginalTitle(metadata.original_title);
          setAlternativeTitle(metadata.alternative_title || "");
          setReleaseYear(metadata.release_year?.toString() || "");
          setImdbScore(
            metadata.imdb_score != null && metadata.imdb_score > 0
              ? metadata.imdb_score.toString()
              : "",
          );
          setImdbUrl(metadata.imdb_url || "");
        }}
      />

      <label className="wishlist-toggle">
        <input
          name="is_wishlist"
          type="checkbox"
          checked={isWishlist}
          onChange={event => setIsWishlist(event.target.checked)}
        />
        <span className="wishlist-toggle-copy">
          <strong>På ønskelisten</strong>
          <small>Vis oppføringen separat fra DVD-ene du allerede eier.</small>
        </span>
      </label>

      <label>
        Originaltittel
        <input
          name="original_title"
          required
          value={originalTitle}
          onChange={event => setOriginalTitle(event.target.value)}
        />
      </label>
      <label>
        Alternativ tittel
        <input
          name="alternative_title"
          value={alternativeTitle}
          onChange={event => setAlternativeTitle(event.target.value)}
        />
      </label>
      <div className="two-col">
        <label>
          Utgivelsesår
          <input
            name="release_year"
            type="number"
            min="1888"
            max={new Date().getFullYear() + 1}
            value={releaseYear}
            onChange={event => setReleaseYear(event.target.value)}
          />
        </label>
        <label>
          IMDb-score
          <input
            name="imdb_score"
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={imdbScore}
            onChange={event => setImdbScore(event.target.value)}
          />
        </label>
      </div>
      <label>
        IMDb-link
        <input
          name="imdb_url"
          type="url"
          placeholder="https://www.imdb.com/title/tt0116695/"
          value={imdbUrl}
          onChange={event => setImdbUrl(event.target.value)}
        />
      </label>
      <div className="two-col">
        <label>
          DVD-region
          <input name="region" defaultValue={defaults?.region || ""} />
        </label>
        <label>
          Utgave / marked
          <input name="edition" defaultValue={defaults?.edition || ""} />
        </label>
      </div>
      <label>
        Merknad
        <textarea name="notes" defaultValue={defaults?.notes || ""} />
      </label>
      <button className="primary" disabled={busy}>
        {busy
          ? "Arbeider…"
          : release
            ? "Lagre endringer"
            : isWishlist
              ? "Legg til på ønskelisten"
              : "Opprett DVD"}
      </button>
    </form>
  );
}
