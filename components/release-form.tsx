"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Release } from "@/lib/types";
import { MovieMetadataAssistant } from "@/components/movie-metadata-assistant";

type DuplicateMatch = Pick<Release, "id" | "original_title" | "alternative_title" | "release_year" | "is_wishlist" | "edition" | "region">;

export function ReleaseForm({ release, initial }: { release?: Release; initial?: Release }) {
  const defaults = release || initial;
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [operationLabel, setOperationLabel] = useState("");
  const activeRequestRef = useRef<AbortController | null>(null);
  const [coverPath, setCoverPath] = useState(defaults?.cover_path || "");
  const [thumbnailPath, setThumbnailPath] = useState(defaults?.thumbnail_path || "");
  const [preview, setPreview] = useState(defaults?.cover_url || "");
  const [isWishlist, setIsWishlist] = useState(defaults?.is_wishlist ?? false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [originalTitle, setOriginalTitle] = useState(defaults?.original_title || "");
  const [alternativeTitle, setAlternativeTitle] = useState(defaults?.alternative_title || "");
  const [releaseYear, setReleaseYear] = useState(defaults?.release_year?.toString() || "");
  const [imdbScore, setImdbScore] = useState(defaults?.imdb_score && defaults.imdb_score > 0 ? defaults.imdb_score.toString() : "");
  const [imdbUrl, setImdbUrl] = useState(defaults?.imdb_url || "");
  const [pendingPayload, setPendingPayload] = useState<Record<string, FormDataEntryValue> | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [selectedDuplicateId, setSelectedDuplicateId] = useState("");

  async function requestWithTimeout(
    url: string,
    options: RequestInit,
    label: string,
    timeoutMs = 45_000,
  ) {
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setBusy(true);
    setError("");
    setOperationLabel(label);

    const timeoutId = window.setTimeout(() => {
      controller.abort("timeout");
    }, timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        const timedOut = controller.signal.reason === "timeout";
        throw new Error(
          timedOut
            ? "Operasjonen tok for lang tid og ble avbrutt. Skjemaet er beholdt. Kontroller om endringen likevel ble lagret før du prøver igjen."
            : "Operasjonen ble avbrutt. Skjemaet er beholdt. Kontroller om endringen likevel ble lagret før du prøver igjen.",
        );
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);

      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setBusy(false);
        setOperationLabel("");
      }
    }
  }

  async function readJson(response: Response) {
    const text = await response.text();

    if (!text) return {} as Record<string, unknown>;

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: `Serveren svarte med ugyldige data (${response.status}).` };
    }
  }

  function cancelOperation() {
    activeRequestRef.current?.abort("user");
  }

  async function upload(file: File) {
    const body = new FormData();
    body.append("file", file);

    const res = await requestWithTimeout(
      "/api/upload",
      { method: "POST", body },
      "Laster opp og behandler cover…",
      60_000,
    );
    const json = await readJson(res);

    if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Opplasting feilet");
    setCoverPath(typeof json.path === "string" ? json.path : "");
    setThumbnailPath(typeof json.thumbnailPath === "string" ? json.thumbnailPath : "");
    setPreview(typeof json.url === "string" ? json.url : "");
  }

  function makePayload(form: HTMLFormElement) {
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.cover_path = coverPath;
    payload.thumbnail_path = thumbnailPath;
    payload.is_wishlist = String(isWishlist);
    return payload;
  }

  async function persist(payload: Record<string, FormDataEntryValue>, mode: "normal" | "duplicate" | "replace" = "normal") {
    const replacingId = mode === "replace" ? selectedDuplicateId : "";
    const url = release ? `/api/releases/${release.id}` : replacingId ? `/api/releases/${replacingId}` : "/api/releases";
    const method = release || replacingId ? "PATCH" : "POST";

    try {
      const res = await requestWithTimeout(
        url,
        {
          method,
          headers: {
            "content-type": "application/json",
            ...(mode === "duplicate" ? { "x-allow-duplicate": "true" } : {}),
          },
          body: JSON.stringify(payload),
        },
        release || replacingId ? "Lagrer endringer…" : "Oppretter DVD…",
      );
      const json = await readJson(res);

      if (res.status === 409 && json.code === "DUPLICATE_TITLE") {
        const matches = Array.isArray(json.matches) ? json.matches as DuplicateMatch[] : [];
        setPendingPayload(payload);
        setDuplicateMatches(matches);
        setSelectedDuplicateId(matches[0]?.id || "");
        return;
      }

      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Lagring feilet");
        return;
      }

      if (typeof json.id !== "string") {
        setError("DVD-en kan ha blitt lagret, men serveren returnerte ingen gyldig ID. Oppdater siden og kontroller før du prøver igjen.");
        return;
      }

      setPendingPayload(null);
      setDuplicateMatches([]);
      router.push(`/releases/${json.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Lagring feilet. Skjemaet er beholdt.");
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    await persist(makePayload(e.currentTarget));
  }

  return (
    <>
      <form className={`form panel ${release ? "edit-detail-form" : ""}`} onSubmit={submit}>
        <div className="edit-cover-column">
          <section className="cover-first-field" aria-labelledby="cover-field-title">
            <div className="cover-field-heading"><div><strong id="cover-field-title">Coverbilde</strong><small>Ta et bilde eller last opp et eksisterende cover.</small></div></div>
            <label className="cover-file-label">
              <span>Bytt cover</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  setCoverFile(file);
                  setPreview(URL.createObjectURL(file));
                  await upload(file);
                } catch (err) { setError(err instanceof Error ? err.message : "Feil"); }
              }} />
            </label>
            {preview ? (
              <div className="cover detail-cover cover-form-preview"><img src={preview} alt="Forhåndsvisning av cover" /></div>
            ) : (
              <div className="cover detail-cover cover-form-preview"><span className="muted">Mangler cover</span></div>
            )}
          </section>

          <MovieMetadataAssistant
            coverFile={coverFile}
            existingReleaseId={release?.id}
            initialQuery={originalTitle}
            onApply={(metadata, importedCover) => {
              if (importedCover) {
                setCoverPath(importedCover.path);
                setThumbnailPath(importedCover.thumbnailPath || "");
                setPreview(importedCover.url);
                setCoverFile(null);
              }
              setOriginalTitle(metadata.original_title);
              setAlternativeTitle(metadata.alternative_title || "");
              setReleaseYear(metadata.release_year?.toString() || "");
              setImdbScore(metadata.imdb_score != null && metadata.imdb_score > 0 ? metadata.imdb_score.toString() : "");
              setImdbUrl(metadata.imdb_url || "");
            }}
          />
        </div>

        <div className="edit-fields-column">
          <label className="wishlist-toggle"><input name="is_wishlist" type="checkbox" checked={isWishlist} onChange={event => setIsWishlist(event.target.checked)} /><span className="wishlist-toggle-copy"><strong>På ønskelisten</strong><small>Vis oppføringen separat fra DVD-ene du allerede eier.</small></span></label>
          <label>Originaltittel<input name="original_title" required value={originalTitle} onChange={event => setOriginalTitle(event.target.value)} /></label>
          <label>Alternativ tittel<input name="alternative_title" value={alternativeTitle} onChange={event => setAlternativeTitle(event.target.value)} /></label>
          <div className="two-col">
            <label>Utgivelsesår<input name="release_year" type="number" min="1888" max={new Date().getFullYear() + 1} value={releaseYear} onChange={event => setReleaseYear(event.target.value)} /></label>
            <label>IMDb-score<input name="imdb_score" type="number" min="0" max="10" step="0.1" value={imdbScore} onChange={event => setImdbScore(event.target.value)} /></label>
          </div>
          <label>IMDb-link<input name="imdb_url" type="url" placeholder="https://www.imdb.com/title/tt0116695/" value={imdbUrl} onChange={event => setImdbUrl(event.target.value)} /></label>
          <div className="two-col">
            <label>DVD-region<select name="region" defaultValue={defaults?.region || "2"}><option value="2">2</option><option value="1">1</option></select></label>
            <label>Utgave<select name="edition" defaultValue={defaults?.edition || "Nordisk"}><option value="Nordisk">Nordisk</option><option value="UK">UK</option><option value="US">US</option><option value="Annet">Annet</option></select></label>
          </div>
          <label>Merknad<textarea name="notes" defaultValue={defaults?.notes || ""} /></label>
          <div className="edit-save-area" aria-live="polite">
            {error && <p className="error edit-form-error" role="alert">{error}</p>}
            {busy && operationLabel && <p className="save-progress">{operationLabel}</p>}
            <div className="edit-save-row">
              <button className="primary" disabled={busy}>
                {busy ? "Arbeider…" : release ? "Lagre endringer" : isWishlist ? "Legg til på ønskelisten" : "Opprett DVD"}
              </button>
              {busy && (
                <button type="button" className="button secondary" onClick={cancelOperation}>
                  Avbryt
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {duplicateMatches.length > 0 && pendingPayload && (
        <div className="modal-backdrop" role="presentation">
          <section className="duplicate-dialog" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
            <h2 id="duplicate-title">Tittelen finnes allerede</h2>
            <p>Velg om du vil erstatte en eksisterende oppføring, opprette et duplikat eller avbryte.</p>
            <div className="duplicate-list">
              {duplicateMatches.map(match => (
                <label key={match.id}>
                  <input type="radio" name="duplicate-match" checked={selectedDuplicateId === match.id} onChange={() => setSelectedDuplicateId(match.id)} />
                  <span><strong>{match.original_title}</strong><small>{match.release_year || "Ukjent år"} · {match.is_wishlist ? "Ønskeliste" : "Samling"}{match.edition ? ` · ${match.edition}` : ""}</small></span>
                </label>
              ))}
            </div>
            <div className="actions">
              <button type="button" className="danger" disabled={!selectedDuplicateId || busy} onClick={() => void persist(pendingPayload, "replace")}>Erstatt valgt</button>
              <button type="button" className="primary" disabled={busy} onClick={() => void persist(pendingPayload, "duplicate")}>Lag duplikat</button>
              <button type="button" disabled={busy} onClick={() => { setDuplicateMatches([]); setPendingPayload(null); }}>Avbryt</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
