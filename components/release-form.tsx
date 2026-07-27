"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Release } from "@/lib/types";
import { ImdbScoreButton } from "@/components/imdb-score-button";
import { MovieMetadataAssistant } from "@/components/movie-metadata-assistant";

type DuplicateMatch = {
  id: string;
  original_title: string;
  alternative_title: string | null;
  release_year: number | null;
  is_wishlist: boolean;
  edition: string | null;
  region: string | null;
  imdb_url: string | null;
};

type ReleasePayload = Record<
  string,
  FormDataEntryValue | boolean | null
>;

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

  const [duplicateMatches, setDuplicateMatches] =
    useState<DuplicateMatch[]>([]);

  const [pendingPayload, setPendingPayload] =
    useState<ReleasePayload | null>(null);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);

  const [coverPath, setCoverPath] = useState(
    defaults?.cover_path || "",
  );

  const [thumbnailPath, setThumbnailPath] = useState(
    defaults?.thumbnail_path || "",
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

  const [region, setRegion] = useState(
    defaults?.region
      ? String(defaults.region)
      : "2",
  );

  const [edition, setEdition] = useState(
    defaults?.edition || "Nordisk",
  );

  const [isWishlist, setIsWishlist] = useState(
    defaults?.is_wishlist ?? false,
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
          json?.error ||
            "Opplasting av cover feilet",
        );
      }

      if (!json?.path || !json?.url) {
        throw new Error(
          "Serveren returnerte ikke gyldig informasjon om coverbildet",
        );
      }

      setCoverPath(json.path);
      setThumbnailPath(json.thumbnailPath || "");
      setPreview(json.url);
    } finally {
      setBusy(false);
    }
  }

  function createPayload(
    form: HTMLFormElement,
  ): ReleasePayload {
    const formData = new FormData(form);

    const payload: ReleasePayload =
      Object.fromEntries(formData.entries());

    payload.cover_path = coverPath || null;
    payload.thumbnail_path =
      thumbnailPath || null;

    payload.original_title =
      originalTitle.trim();

    payload.alternative_title =
      alternativeTitle.trim() || null;

    payload.release_year =
      releaseYear.trim() || null;

    payload.imdb_url =
      imdbUrl.trim() || null;

    payload.imdb_score =
      imdbScore.trim() || null;

    payload.region = region;
    payload.edition = edition;
    payload.is_wishlist = isWishlist;

    return payload;
  }

  async function saveRelease(
    payload: ReleasePayload,
    allowDuplicate = false,
  ) {
    const url = release
      ? `/api/releases/${release.id}`
      : "/api/releases";

    const response = await fetch(url, {
      method: release ? "PATCH" : "POST",
      headers: {
        "content-type": "application/json",
        ...(allowDuplicate
          ? {
              "x-allow-duplicate": "true",
            }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    const json = await response
      .json()
      .catch(() => null);

    if (
      !release &&
      response.status === 409 &&
      json?.code === "POSSIBLE_DUPLICATE"
    ) {
      setPendingPayload(payload);

      setDuplicateMatches(
        Array.isArray(json.matches)
          ? json.matches
          : [],
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        json?.error ||
          "Lagring av DVD-en feilet",
      );
    }

    if (!json?.id) {
      throw new Error(
        "DVD-en kan ha blitt lagret, men serveren returnerte ikke en ID",
      );
    }

    setPendingPayload(null);
    setDuplicateMatches([]);

    router.push(`/releases/${json.id}`);
    router.refresh();
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = createPayload(
        event.currentTarget,
      );

      await saveRelease(payload);
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

  async function saveDuplicateAnyway() {
    if (!pendingPayload) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await saveRelease(
        pendingPayload,
        true,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "DVD-en kunne ikke lagres",
      );

      setDuplicateMatches([]);
      setPendingPayload(null);
    } finally {
      setBusy(false);
    }
  }

  function cancelDuplicateSave() {
    setDuplicateMatches([]);
    setPendingPayload(null);
  }

  return (
    <>
      <form
        className="form panel"
        onSubmit={submit}
      >
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

                setPreview(
                  URL.createObjectURL(file),
                );

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

        <label className="wishlist-toggle">
          <input
            type="checkbox"
            name="is_wishlist"
            checked={isWishlist}
            onChange={(event) =>
              setIsWishlist(
                event.target.checked,
              )
            }
          />

          <span className="wishlist-toggle-copy">
            <strong>På ønskelisten</strong>

            <small>
              {isWishlist
                ? "DVD-en vises på ønskelisten."
                : "DVD-en registreres som en del av samlingen."}
            </small>
          </span>
        </label>

        <MovieMetadataAssistant
          coverFile={coverFile}
          initialQuery={originalTitle}
          existingReleaseId={
            release
              ? String(release.id)
              : undefined
          }
          onApply={(
            metadata,
            importedCover,
          ) => {
            setOriginalTitle(
              metadata.original_title ||
                originalTitle,
            );

            setAlternativeTitle(
              metadata.alternative_title || "",
            );

            if (
              metadata.release_year != null
            ) {
              setReleaseYear(
                String(metadata.release_year),
              );
            }

            setImdbUrl(
              metadata.imdb_url || "",
            );

            setImdbScore(
              metadata.imdb_score != null &&
                metadata.imdb_score > 0
                ? String(metadata.imdb_score)
                : "",
            );

            if (importedCover) {
              setCoverPath(
                importedCover.path,
              );

              setThumbnailPath(
                importedCover.thumbnailPath ||
                  "",
              );

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
              setOriginalTitle(
                event.target.value,
              )
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
              max={
                new Date().getFullYear() +
                1
              }
              value={releaseYear}
              onChange={(event) =>
                setReleaseYear(
                  event.target.value,
                )
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
                setImdbScore(
                  event.target.value,
                )
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
              setImdbUrl(
                event.target.value,
              )
            }
            placeholder="https://www.imdb.com/title/tt..."
          />
        </label>

        <div className="two-col">
          <label>
            DVD-region

            <select
              name="region"
              value={region}
              onChange={(event) =>
                setRegion(
                  event.target.value,
                )
              }
            >
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>

          <label>
            Utgave / marked

            <select
              name="edition"
              value={edition}
              onChange={(event) =>
                setEdition(
                  event.target.value,
                )
              }
            >
              <option value="Nordisk">
                Nordisk
              </option>

              <option value="UK">
                UK
              </option>

              <option value="US">
                US
              </option>

              <option value="Asia">
                Asia
              </option>

              <option value="Annet">
                Annet
              </option>
            </select>
          </label>
        </div>

        <label>
          Merknad

          <textarea
            name="notes"
            defaultValue={
              defaults?.notes || ""
            }
          />
        </label>

        <p className="muted">
          Status:{" "}
          <strong>
            {isWishlist
              ? "På ønskelisten"
              : "I samlingen"}
          </strong>
        </p>

        {error && (
          <p
            className="error"
            role="alert"
          >
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

      {pendingPayload &&
        duplicateMatches.length > 0 && (
          <div
            className="modal-backdrop"
            role="presentation"
          >
            <section
              className="duplicate-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="duplicate-title"
            >
              <h2 id="duplicate-title">
                Filmen finnes allerede
              </h2>

              <p>
                Det finnes én eller flere
                registreringer med samme
                originaltittel eller IMDb-lenke.
                Det kan likevel være en annen
                DVD-utgave.
              </p>

              <div className="duplicate-list">
                {duplicateMatches.map(
                  (match) => (
                    <div
                      className="duplicate-match"
                      key={match.id}
                    >
                      <strong>
                        {match.original_title}
                      </strong>

                      {match.alternative_title && (
                        <span>
                          {
                            match.alternative_title
                          }
                        </span>
                      )}

                      <small>
                        {match.release_year ??
                          "Ukjent år"}
                        {" · "}
                        {match.is_wishlist
                          ? "På ønskelisten"
                          : "I samlingen"}
                        {match.edition
                          ? ` · ${match.edition}`
                          : ""}
                        {match.region
                          ? ` · Region ${match.region}`
                          : ""}
                      </small>
                    </div>
                  ),
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void saveDuplicateAnyway()
                  }
                >
                  {busy
                    ? "Lagrer…"
                    : "Lagre likevel"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={
                    cancelDuplicateSave
                  }
                >
                  Avbryt
                </button>
              </div>
            </section>
          </div>
        )}
    </>
  );
}