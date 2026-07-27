"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Release } from "@/lib/types";
import { ImdbScoreButton } from "@/components/imdb-score-button";
import { MovieMetadataAssistant } from "@/components/movie-metadata-assistant";

export function ReleaseForm({
  release,
  initial,
}: {
  release?: Release;
  initial?: Release;
}) {
  const defaults = release || initial;
  const router = useRouter();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(
    null,
  );

  const [coverPath, setCoverPath] = useState(
    defaults?.cover_path || "",
  );

  const [preview, setPreview] = useState(
    defaults?.cover_url || "",
  );

  const [originalTitle, setOriginalTitle] = useState(
    defaults?.original_title || "",
  );

  const [alternativeTitle, setAlternativeTitle] =
    useState(defaults?.alternative_title || "");

  const [releaseYear, setReleaseYear] = useState(
    defaults?.release_year != null
      ? String(defaults.release_year)
      : "",
  );

  const [imdbUrl, setImdbUrl] = useState(
    defaults?.imdb_url || "",
  );

  const [imdbScore, setImdbScore] = useState(
    defaults?.imdb_score != null
      ? String(defaults.imdb_score)
      : "",
  );

  async function upload(file: File) {
    setBusy(true);
    setError("");

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.error || "Opplasting av cover feilet",
        );
      }

      if (!json?.path || !json?.url) {
        throw new Error(
          "Serveren returnerte ikke gyldig informasjon om coverbildet",
        );
      }

      setCoverPath(json.path);
      setPreview(json.url);
    } finally {
      setBusy(false);
    }
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const formData = new FormData(
        event.currentTarget,
      );

      const payload: Record<
        string,
        FormDataEntryValue | null
      > = Object.fromEntries(formData.entries());

      payload.cover_path = coverPath;
      payload.original_title = originalTitle.trim();
      payload.alternative_title =
        alternativeTitle.trim();
      payload.release_year =
        releaseYear.trim() || null;
      payload.imdb_url = imdbUrl.trim() || null;
      payload.imdb_score =
        imdbScore.trim() || null;

      const url = release
        ? `/api/releases/${release.id}`
        : "/api/releases";

      const response = await fetch(url, {
        method: release ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.error || "Lagring av DVD-en feilet",
        );
      }

      if (!json?.id) {
        throw new Error(
          "DVD-en kan ha blitt lagret, men serveren returnerte ikke en ID",
        );
      }

      router.push(`/releases/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "En ukjent feil oppstod under lagring",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <section className="cover-edit-section">
        <label>
          Coverbilde
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            disabled={busy}
            onChange={async (event) => {
              const file =
                event.target.files?.[0];

              if (!file) {
                return;
              }

              setCoverFile(file);

              const temporaryPreview =
                URL.createObjectURL(file);

              setPreview(temporaryPreview);

              try {
                await upload(file);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Opplasting av cover feilet",
                );
              }
            }}
          />
        </label>

        {preview && (
          <div className="cover detail-cover">
            <img
              src={preview}
              alt="Forhåndsvisning av cover"
            />
          </div>
        )}
      </section>

      <MovieMetadataAssistant
        coverFile={coverFile}
        initialQuery={originalTitle}
        existingReleaseId={
          release ? String(release.id) : undefined
        }
        onApply={(metadata, importedCover) => {
          setOriginalTitle(
            metadata.original_title || originalTitle,
          );

          setAlternativeTitle(
            metadata.alternative_title || "",
          );

          if (metadata.release_year != null) {
            setReleaseYear(
              String(metadata.release_year),
            );
          }

          if (metadata.imdb_url) {
            setImdbUrl(metadata.imdb_url);
          }

          if (
            metadata.imdb_score != null &&
            metadata.imdb_score > 0
          ) {
            setImdbScore(
              String(metadata.imdb_score),
            );
          } else {
            setImdbScore("");
          }

          if (importedCover) {
            setCoverPath(importedCover.path);
            setPreview(importedCover.url);
            setCoverFile(null);
          }
        }}
      />

      <label>
        Originaltittel
        <input
          name="original_title"
          required
          value={originalTitle}
          onChange={(event) =>
            setOriginalTitle(event.target.value)
          }
        />
      </label>

      <label>
        Alternativ tittel
        <input
          name="alternative_title"
          value={alternativeTitle}
          onChange={(event) =>
            setAlternativeTitle(
              event.target.value,
            )
          }
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
            onChange={(event) =>
              setReleaseYear(event.target.value)
            }
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
            onChange={(event) =>
              setImdbScore(event.target.value)
            }
          />
        </label>
      </div>

      {release && (
        <ImdbScoreButton
          releaseId={String(release.id)}
          imdbUrl={imdbUrl || null}
          onUpdated={(score) => {
            setImdbScore(String(score));
          }}
        />
      )}

      <label>
        IMDb-lenke
        <input
          name="imdb_url"
          type="url"
          value={imdbUrl}
          onChange={(event) =>
            setImdbUrl(event.target.value)
          }
          placeholder="https://www.imdb.com/title/tt..."
        />
      </label>

      <div className="two-col">
        <label>
          DVD-region
          <input
            name="region"
            defaultValue={defaults?.region || ""}
          />
        </label>

        <label>
          Utgave / marked
          <input
            name="edition"
            defaultValue={defaults?.edition || ""}
          />
        </label>
      </div>

      <label>
        Merknad
        <textarea
          name="notes"
          defaultValue={defaults?.notes || ""}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="primary"
        disabled={busy}
      >
        {busy
          ? "Arbeider…"
          : release
            ? "Lagre endringer"
            : "Opprett DVD"}
      </button>
    </form>
  );
}