"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Release } from "@/lib/types";
import { ImdbScoreButton } from "@/components/imdb-score-button";
import { MovieMetadataAssistant } from "@/components/movie-metadata-assistant";
import { splitKeywordInput } from "@/lib/keyword-utils";
import {
  formatReleaseNotes,
  parseReleaseNotes,
  type StructuredNoteLabel,
  structuredNoteLabels,
} from "@/lib/release-notes";

type MetadataManualField =
  | "original_title"
  | "alternative_title"
  | "release_year"
  | "imdb_url"
  | "overview"
  | "runtime_minutes"
  | "genres";

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
  FormDataEntryValue | boolean | string[] | null
>;

type MetadataPreview = {
  metadata: Record<string, unknown>;
  changedFields: string[];
};

function normalizeImdbUrlInput(value: string) {
  const match = value.trim().match(
    /\/title\/(tt\d{7,10})(?:\/|$)/i,
  );

  if (!match) {
    return value;
  }

  return `https://www.imdb.com/title/${match[1].toLowerCase()}/`;
}

export function ReleaseForm({
  release,
  initial,
}: {
  release?: Release;
  initial?: Release;
}) {
  const defaults = release || initial;
  const parsedNotes = parseReleaseNotes(
    defaults?.notes,
  );
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

  const [manualKeywords, setManualKeywords] = useState(
    (defaults?.manual_keywords ?? []).join(", "),
  );

  const [overview, setOverview] = useState(
    defaults?.overview || "",
  );

  const [runtimeMinutes, setRuntimeMinutes] =
    useState(
      defaults?.runtime_minutes != null
        ? String(defaults.runtime_minutes)
        : "",
    );

  const [genres, setGenres] = useState(
    (defaults?.genres ?? []).join(", "),
  );

  const [discCount, setDiscCount] = useState(
    parsedNotes.discCount,
  );

  const [selectedNoteLabels, setSelectedNoteLabels] =
    useState<StructuredNoteLabel[]>(
      parsedNotes.selectedLabels,
    );

  const [autoKeywords, setAutoKeywords] = useState(
    defaults?.auto_keywords ?? [],
  );

  const [metadataProvider, setMetadataProvider] =
    useState(
      defaults?.metadata_provider || "",
    );

  const [metadataProviderId, setMetadataProviderId] =
    useState(
      defaults?.metadata_provider_id || "",
    );

  const [
    metadataLastEnrichedAt,
    setMetadataLastEnrichedAt,
  ] = useState(
    defaults?.metadata_last_enriched_at || "",
  );

  const [
    metadataManualFields,
    setMetadataManualFields,
  ] = useState<MetadataManualField[]>(
    (defaults?.metadata_manual_fields ??
      []) as MetadataManualField[],
  );

  const [
    metadataPreview,
    setMetadataPreview,
  ] = useState<MetadataPreview | null>(null);

  const [
    metadataBusy,
    setMetadataBusy,
  ] = useState(false);

  function markManualField(
    field: MetadataManualField,
  ) {
    setMetadataManualFields((current) =>
      current.includes(field)
        ? current
        : [...current, field],
    );
  }

  function splitListInput(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function toggleStructuredNoteLabel(
    label: StructuredNoteLabel,
  ) {
    setSelectedNoteLabels((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  }

  function buildMetadataSnapshot(
    overrides?: Partial<{
      original_title: string;
      alternative_title: string;
      release_year: string;
      imdb_url: string;
      overview: string;
      runtime_minutes: string;
      genres: string;
      metadata_provider: string;
      metadata_provider_id: string;
    }>,
  ) {
    const nextOriginalTitle =
      overrides?.original_title ?? originalTitle;
    const nextAlternativeTitle =
      overrides?.alternative_title ??
      alternativeTitle;
    const nextReleaseYear =
      overrides?.release_year ?? releaseYear;
    const nextImdbUrl =
      overrides?.imdb_url ?? imdbUrl;
    const nextOverview =
      overrides?.overview ?? overview;
    const nextRuntimeMinutes =
      overrides?.runtime_minutes ??
      runtimeMinutes;
    const nextGenres =
      overrides?.genres ?? genres;
    const nextProvider =
      overrides?.metadata_provider ??
      metadataProvider;
    const nextProviderId =
      overrides?.metadata_provider_id ??
      metadataProviderId;

    return {
      original_title:
        nextOriginalTitle.trim(),
      alternative_title:
        nextAlternativeTitle.trim() || null,
      release_year: nextReleaseYear.trim()
        ? Number(nextReleaseYear)
        : null,
      imdb_url: nextImdbUrl.trim() || null,
      overview: nextOverview.trim() || null,
      runtime_minutes:
        nextRuntimeMinutes.trim()
          ? Number(nextRuntimeMinutes)
          : null,
      genres: splitListInput(nextGenres),
      auto_keywords: autoKeywords,
      metadata_provider:
        nextProvider.trim() || null,
      metadata_provider_id:
        nextProviderId.trim() || null,
      metadata_manual_fields:
        metadataManualFields,
    };
  }

  function applyMetadataPreview(
    metadata: Record<string, unknown>,
  ) {
    if (
      typeof metadata.original_title === "string"
    ) {
      setOriginalTitle(metadata.original_title);
    }

    if (
      typeof metadata.alternative_title === "string" ||
      metadata.alternative_title === null
    ) {
      setAlternativeTitle(
        typeof metadata.alternative_title ===
          "string"
          ? metadata.alternative_title
          : "",
      );
    }

    if (
      typeof metadata.release_year === "number"
    ) {
      setReleaseYear(String(metadata.release_year));
    }

    if (
      typeof metadata.imdb_url === "string" ||
      metadata.imdb_url === null
    ) {
      setImdbUrl(
        typeof metadata.imdb_url === "string"
          ? metadata.imdb_url
          : "",
      );
    }

    if (
      typeof metadata.overview === "string" ||
      metadata.overview === null
    ) {
      setOverview(
        typeof metadata.overview === "string"
          ? metadata.overview
          : "",
      );
    }

    if (
      typeof metadata.runtime_minutes ===
      "number"
    ) {
      setRuntimeMinutes(
        String(metadata.runtime_minutes),
      );
    }

    if (Array.isArray(metadata.genres)) {
      setGenres(metadata.genres.join(", "));
    }

    if (
      typeof metadata.metadata_provider ===
      "string"
    ) {
      setMetadataProvider(
        metadata.metadata_provider,
      );
    }

    if (
      typeof metadata.metadata_provider_id ===
      "string"
    ) {
      setMetadataProviderId(
        metadata.metadata_provider_id,
      );
    }

    if (
      typeof metadata.metadata_last_enriched_at ===
      "string"
    ) {
      setMetadataLastEnrichedAt(
        metadata.metadata_last_enriched_at,
      );
    }

    if (
      typeof metadata.keywords_updated_at ===
      "string"
    ) {
      setMetadataLastEnrichedAt(
        metadata.keywords_updated_at,
      );
    }

    if (Array.isArray(metadata.auto_keywords)) {
      setAutoKeywords(
        metadata.auto_keywords.filter(
          (
            value,
          ): value is string =>
            typeof value === "string",
        ),
      );
    }
  }

  async function requestMetadataPreview(
    options?: {
      force?: boolean;
      autoApply?: boolean;
      overrides?: Partial<{
        original_title: string;
        alternative_title: string;
        release_year: string;
        imdb_url: string;
        overview: string;
        metadata_provider: string;
        metadata_provider_id: string;
      }>;
    },
  ) {
    const current = buildMetadataSnapshot(
      options?.overrides,
    );

    if (
      !current.metadata_provider_id &&
      !current.imdb_url &&
      !current.original_title
    ) {
      throw new Error(
        "Velg en film eller fyll inn tittel først.",
      );
    }

    setMetadataBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/releases/metadata/enrich",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            current,
            source: {
              provider:
                current.metadata_provider,
              providerId:
                current.metadata_provider_id,
              title:
                current.original_title,
              releaseYear:
                current.release_year,
              imdbUrl: current.imdb_url,
            },
            options: {
              force: options?.force,
            },
          }),
        },
      );

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.error ||
            "Metadata kunne ikke hentes",
        );
      }

      const preview = {
        metadata:
          (json?.metadata as Record<
            string,
            unknown
          >) ?? {},
        changedFields: Array.isArray(
          json?.changedFields,
        )
          ? json.changedFields
          : [],
      };

      if (options?.autoApply) {
        applyMetadataPreview(preview.metadata);
        setMetadataPreview(null);
      } else {
        setMetadataPreview(preview);
      }

      return preview;
    } finally {
      setMetadataBusy(false);
    }
  }

  function previewFieldValue(field: string) {
    switch (field) {
      case "original_title":
        return originalTitle || "–";
      case "alternative_title":
        return alternativeTitle || "–";
      case "release_year":
        return releaseYear || "–";
      case "imdb_url":
        return imdbUrl || "–";
      case "overview":
        return overview || "–";
      case "runtime_minutes":
        return runtimeMinutes || "–";
      case "genres":
        return genres || "–";
      default:
        return "–";
    }
  }

  function formatPreviewValue(value: unknown) {
    if (Array.isArray(value)) {
      return value.join(", ") || "–";
    }

    if (value === null || value === undefined || value === "") {
      return "–";
    }

    return String(value);
  }

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
    payload.overview = overview.trim() || null;
    payload.runtime_minutes =
      runtimeMinutes.trim() || null;
    payload.genres = splitListInput(genres);
    payload.notes = formatReleaseNotes({
      discCount,
      selectedLabels: selectedNoteLabels,
      customText: "",
    });
    payload.manual_keywords = splitKeywordInput(manualKeywords);
    payload.metadata_provider =
      metadataProvider.trim() || null;
    payload.metadata_provider_id =
      metadataProviderId.trim() || null;
    payload.metadata_manual_fields =
      metadataManualFields;

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
            const nextOriginalTitle =
              metadataManualFields.includes(
                "original_title",
              ) &&
              originalTitle.trim()
                ? originalTitle
                : metadata.original_title ||
                  originalTitle;

            const nextAlternativeTitle =
              metadataManualFields.includes(
                "alternative_title",
              ) &&
              alternativeTitle.trim()
                ? alternativeTitle
                : metadata.alternative_title ||
                  "";

            const nextReleaseYear =
              metadataManualFields.includes(
                "release_year",
              ) &&
              releaseYear.trim()
                ? releaseYear
                : metadata.release_year != null
                  ? String(
                      metadata.release_year,
                    )
                  : releaseYear;

            const nextImdbUrl =
              metadataManualFields.includes(
                "imdb_url",
              ) &&
              imdbUrl.trim()
                ? imdbUrl
                : metadata.imdb_url || "";

            const nextOverview =
              metadataManualFields.includes(
                "overview",
              ) &&
              overview.trim()
                ? overview
                : metadata.overview || overview;

            setOriginalTitle(
              nextOriginalTitle,
            );
            setAlternativeTitle(
              nextAlternativeTitle,
            );
            setReleaseYear(nextReleaseYear);
            setImdbUrl(nextImdbUrl);
            setOverview(nextOverview);

            if (
              metadata.imdb_score != null &&
              metadata.imdb_score > 0
            ) {
              setImdbScore(
                String(metadata.imdb_score),
              );
            }

            setMetadataProvider(
              metadata.metadata_provider ||
                "tmdb",
            );
            setMetadataProviderId(
              metadata.metadata_provider_id ||
                "",
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

            void requestMetadataPreview({
            autoApply: true,
            overrides: {
              original_title:
                nextOriginalTitle,
              alternative_title:
                nextAlternativeTitle,
              release_year:
                nextReleaseYear,
              imdb_url: nextImdbUrl,
              overview: nextOverview,
              metadata_provider:
                metadata.metadata_provider ||
                "tmdb",
              metadata_provider_id:
                metadata.metadata_provider_id ||
                "",
            },
            }).catch((err) => {
            setError(
              err instanceof Error
                ? err.message
                : "Metadata kunne ikke hentes",
            );
            });
          }}
        />

        <fieldset className="status-radio-group">
          <legend>Status</legend>

          <label className="status-radio-option">
            <input
              type="radio"
              name="collection_status"
              checked={!isWishlist}
              onChange={() => setIsWishlist(false)}
            />

            <span>I samlingen</span>
          </label>

          <label className="status-radio-option">
            <input
              type="radio"
              name="collection_status"
              checked={isWishlist}
              onChange={() => setIsWishlist(true)}
            />

            <span>På ønskelisten</span>
          </label>
        </fieldset>

        <label>
          Originaltittel

          <input
            name="original_title"
            required
            value={originalTitle}
            onChange={(event) => {
              markManualField("original_title");
              setOriginalTitle(event.target.value);
            }}
          />
        </label>

        <label>
          Alternativ tittel

          <input
            name="alternative_title"
            value={alternativeTitle}
            onChange={(event) => {
              markManualField("alternative_title");
              setAlternativeTitle(event.target.value);
            }}
          />
        </label>

        {release && (
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
                  {
                    markManualField(
                      "release_year",
                    );
                    setReleaseYear(
                      event.target.value,
                    );
                  }
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
        )}

        <div className="two-col">
          <label>
            DVD-region

            <select
              name="region"
              value={region}
              onChange={(event) =>
                setRegion(event.target.value)
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
                setEdition(event.target.value)
              }
            >
              <option value="Nordisk">
                Nordisk
              </option>

              <option value="UK">UK</option>

              <option value="US">US</option>

              <option value="Asia">Asia</option>

              <option value="Annet">Annet</option>
            </select>
          </label>
        </div>

        {release ? (
          <>
            <div className="disc-count-inline">
              <span>Antall discer</span>

              <select
                value={String(discCount)}
                onChange={(event) =>
                  setDiscCount(
                    Number(event.target.value),
                  )
                }
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option
                    key={count}
                    value={count}
                  >
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="note-annotation-fieldset">
              <legend>Merknadsvalg</legend>

              <div className="note-annotation-options">
                {structuredNoteLabels.map((label) => (
                  <label
                    key={label}
                    className="note-annotation-option"
                  >
                    <input
                      type="checkbox"
                      checked={selectedNoteLabels.includes(
                        label,
                      )}
                      onChange={() =>
                        toggleStructuredNoteLabel(
                          label,
                        )
                      }
                    />

                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <details className="metadata-collapsible">
              <summary>
                <span className="metadata-collapsible-chevron" />
                Vis metadata
              </summary>

              <div className="metadata-collapsible-body">
                <section className="panel">
                  <div className="metadata-assistant-heading">
                    <strong>Metadata fra TMDB</strong>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      disabled={metadataBusy || busy}
                      onClick={() =>
                        void requestMetadataPreview()
                          .catch((err) => {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Metadata kunne ikke hentes",
                            );
                          })
                      }
                    >
                      {metadataBusy
                        ? "Henter metadata …"
                        : "Fyll inn manglende metadata"}
                    </button>
                  </div>

                  {metadataLastEnrichedAt && (
                    <p className="muted small">
                      Sist beriket:{" "}
                      {new Date(
                        metadataLastEnrichedAt,
                      ).toLocaleString("nb-NO")}
                    </p>
                  )}

                  {metadataPreview && (
                    <div className="admin-result">
                      <h3>Forslag før lagring</h3>

                      {metadataPreview.changedFields.length >
                      0 ? (
                        <ul className="duplicate-list">
                          {metadataPreview.changedFields.map(
                            (field) => (
                              <li
                                className="duplicate-match"
                                key={field}
                              >
                                <strong>{field}</strong>
                                <span>
                                  {previewFieldValue(
                                    field,
                                  )}{" "}
                                  →{" "}
                                  {formatPreviewValue(
                                    metadataPreview
                                      .metadata[field],
                                  )}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p>
                          Ingen manglende felter kunne
                          fylles nå.
                        </p>
                      )}

                      <div className="form-actions">
                        <button
                          type="button"
                          className="primary"
                          disabled={
                            metadataPreview
                              .changedFields.length === 0
                          }
                          onClick={() => {
                            applyMetadataPreview(
                              metadataPreview.metadata,
                            );
                            setMetadataPreview(null);
                          }}
                        >
                          Bruk metadataforslag
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setMetadataPreview(null)
                          }
                        >
                          Lukk
                        </button>
                      </div>
                    </div>
                  )}
                </section>



                <ImdbScoreButton
                  releaseId={String(release.id)}
                  imdbUrl={imdbUrl || null}
                  onUpdated={(score) => {
                    setImdbScore(String(score));
                  }}
                />

                <label>
                  IMDb-lenke

                  <input
                    name="imdb_url"
                    type="url"
                    value={imdbUrl}
                    onChange={(event) =>
                      {
                        markManualField("imdb_url");
                        setImdbUrl(
                          normalizeImdbUrlInput(
                            event.target.value,
                          ),
                        );
                      }
                    }
                    placeholder="https://www.imdb.com/title/tt..."
                  />
                </label>

                <label>
                  Oversikt

                  <textarea
                    name="overview"
                    value={overview}
                    onChange={(event) => {
                      markManualField("overview");
                      setOverview(
                        event.target.value,
                      );
                    }}
                  />
                </label>

                <div className="two-col">
                  <label>
                    Spilletid (minutter)

                    <input
                      name="runtime_minutes"
                      type="number"
                      min="1"
                      max="999"
                      value={runtimeMinutes}
                      onChange={(event) => {
                        markManualField(
                          "runtime_minutes",
                        );
                        setRuntimeMinutes(
                          event.target.value,
                        );
                      }}
                    />
                  </label>

                  <label>
                    Sjangre

                    <input
                      name="genres"
                      value={genres}
                      onChange={(event) => {
                        markManualField("genres");
                        setGenres(
                          event.target.value,
                        );
                      }}
                      placeholder="Action, Thriller, Drama"
                    />
                  </label>
                </div>

                <label>
                  Manuelle nøkkelord (kommaseparert)
                  <input
                    name="manual_keywords"
                    value={manualKeywords}
                    onChange={(event) =>
                      setManualKeywords(event.target.value)
                    }
                    placeholder="f.eks. genre:action, mood:dark, noir"
                  />
                </label>

                {!!autoKeywords.length && (
                  <p className="muted small">
                    Automatiske nøkkelord:{" "}
                    {autoKeywords.join(", ")}
                  </p>
                )}
              </div>
            </details>
          </>
        ) : (
          <>
            <details
              className="metadata-collapsible"
              open
            >
              <summary>
                <span className="metadata-collapsible-chevron" />
                Vis metadata
              </summary>

              <div className="metadata-collapsible-body">
                <section className="panel">
              <div className="metadata-assistant-heading">
                <strong>Metadata fra TMDB</strong>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  disabled={metadataBusy || busy}
                  onClick={() =>
                    void requestMetadataPreview()
                      .catch((err) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Metadata kunne ikke hentes",
                        );
                      })
                  }
                >
                  {metadataBusy
                    ? "Henter metadata …"
                    : "Fyll inn manglende metadata"}
                </button>
              </div>

              {metadataLastEnrichedAt && (
                <p className="muted small">
                  Sist beriket:{" "}
                  {new Date(
                    metadataLastEnrichedAt,
                  ).toLocaleString("nb-NO")}
                </p>
              )}

              {metadataPreview && (
                <div className="admin-result">
                  <h3>Forslag før lagring</h3>

                  {metadataPreview.changedFields.length >
                  0 ? (
                    <ul className="duplicate-list">
                      {metadataPreview.changedFields.map(
                        (field) => (
                          <li
                            className="duplicate-match"
                            key={field}
                          >
                            <strong>{field}</strong>
                            <span>
                              {previewFieldValue(
                                field,
                              )}{" "}
                              →{" "}
                              {formatPreviewValue(
                                metadataPreview
                                  .metadata[field],
                              )}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p>
                      Ingen manglende felter kunne
                      fylles nå.
                    </p>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={
                        metadataPreview
                          .changedFields.length === 0
                      }
                      onClick={() => {
                        applyMetadataPreview(
                          metadataPreview.metadata,
                        );
                        setMetadataPreview(null);
                      }}
                    >
                      Bruk metadataforslag
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMetadataPreview(null)
                      }
                    >
                      Lukk
                    </button>
                  </div>
                </div>
              )}
                </section>

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
                    {
                      markManualField(
                        "release_year",
                      );
                      setReleaseYear(
                        event.target.value,
                      );
                    }
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

            <label>
              IMDb-lenke

              <input
                name="imdb_url"
                type="url"
                value={imdbUrl}
                onChange={(event) =>
                  {
                    markManualField("imdb_url");
                    setImdbUrl(
                          normalizeImdbUrlInput(
                            event.target.value,
                          ),
                        );
                  }
                }
                placeholder="https://www.imdb.com/title/tt..."
              />
            </label>

            <label>
              Oversikt

              <textarea
                name="overview"
                value={overview}
                onChange={(event) => {
                  markManualField("overview");
                  setOverview(
                    event.target.value,
                  );
                }}
              />
            </label>

            <div className="two-col">
              <label>
                Spilletid (minutter)

                <input
                  name="runtime_minutes"
                  type="number"
                  min="1"
                  max="999"
                  value={runtimeMinutes}
                  onChange={(event) => {
                    markManualField(
                      "runtime_minutes",
                    );
                    setRuntimeMinutes(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <label>
                Sjangre

                <input
                  name="genres"
                  value={genres}
                  onChange={(event) => {
                    markManualField("genres");
                    setGenres(
                      event.target.value,
                    );
                  }}
                  placeholder="Action, Thriller, Drama"
                />
              </label>
                </div>

                <label>
                  Manuelle nøkkelord (kommaseparert)
                  <input
                    name="manual_keywords"
                    value={manualKeywords}
                    onChange={(event) =>
                      setManualKeywords(event.target.value)
                    }
                    placeholder="f.eks. genre:action, mood:dark, noir"
                  />
                </label>

                {!!autoKeywords.length && (
                  <p className="muted small">
                    Automatiske nøkkelord:{" "}
                    {autoKeywords.join(", ")}
                  </p>
                )}
              </div>
            </details>

            <div className="disc-count-inline">
              <span>Antall discer</span>

              <select
                value={String(discCount)}
                onChange={(event) =>
                  setDiscCount(
                    Number(event.target.value),
                  )
                }
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option
                    key={count}
                    value={count}
                  >
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="note-annotation-fieldset">
              <legend>Merknadsvalg</legend>

              <div className="note-annotation-options">
                {structuredNoteLabels.map((label) => (
                  <label
                    key={label}
                    className="note-annotation-option"
                  >
                    <input
                      type="checkbox"
                      checked={selectedNoteLabels.includes(
                        label,
                      )}
                      onChange={() =>
                        toggleStructuredNoteLabel(
                          label,
                        )
                      }
                    />

                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

          </>
        )}

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
