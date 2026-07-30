import { parseImdbId, uniqueKeywords } from "@/lib/keyword-utils";
import { metadataManualFieldNames } from "@/lib/validation";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export type MetadataManualField =
  (typeof metadataManualFieldNames)[number];

export type ReleaseMetadataShape = {
  original_title?: string | null;
  alternative_title?: string | null;
  release_year?: number | null;
  imdb_url?: string | null;
  overview?: string | null;
  runtime_minutes?: number | null;
  genres?: string[] | null;
  auto_keywords?: string[] | null;
  metadata_provider?: string | null;
  metadata_provider_id?: string | null;
  metadata_last_enriched_at?: string | null;
  metadata_manual_fields?: string[] | null;
  keywords_source?: string | null;
  keywords_updated_at?: string | null;
};

export type EnrichDvdMetadataInput = {
  title?: string | null;
  releaseYear?: number | null;
  imdbUrl?: string | null;
  imdbId?: string | null;
  provider?: string | null;
  providerId?: string | null;
  tmdbId?: number | null;
};

export type EnrichmentOptions = {
  force?: boolean;
  protectedFields?: MetadataManualField[];
};

export type EnrichmentResult = {
  metadata: ReleaseMetadataShape;
  changedFields: string[];
  provider: string;
  providerId: string;
  raw: Record<string, unknown>;
};

type TmdbMoviePayload = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  overview?: string | null;
  runtime?: number | null;
  genres?: Array<{ name?: string | null }>;
  external_ids?: { imdb_id?: string | null };
  keywords?: {
    keywords?: Array<{ name?: string | null }>;
    results?: Array<{ name?: string | null }>;
  };
  credits?: {
    cast?: Array<{ name?: string | null }>;
    crew?: Array<{ name?: string | null; job?: string | null }>;
  };
};

function getTmdbToken() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "TMDB_READ_ACCESS_TOKEN mangler på serveren",
    );
  }

  return token;
}

async function tmdbFetch<T>(
  path: string,
  token: string,
  searchParams?: Record<
    string,
    string | number | undefined | null
  >,
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(
    searchParams ?? {},
  )) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + token,
      accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(
      "TMDB enrichment request failed",
      response.status,
      path,
      details,
    );

    throw new Error("Filmdatabasen kunne ikke nås");
  }

  return response.json() as Promise<T>;
}

function isFilled(
  value: string | number | string[] | null | undefined,
) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function normalizeImdbUrl(imdbId?: string | null) {
  return imdbId
    ? `https://www.imdb.com/title/${imdbId.toLowerCase()}/`
    : null;
}

function toReleaseYear(
  value?: string | null,
) {
  if (!value) {
    return null;
  }

  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) ? year : null;
}

function keywordsFromTmdbPayload(
  payload: TmdbMoviePayload,
) {
  const year = toReleaseYear(payload.release_date);
  const decade = year
    ? `era:${Math.floor(year / 10) * 10}s`
    : null;

  const genres = (payload.genres ?? []).map(
    (genre) => `genre:${genre.name}`,
  );

  const keywords = (
    payload.keywords?.keywords ??
    payload.keywords?.results ??
    []
  ).map((keyword) => `theme:${keyword.name}`);

  const cast = (
    payload.credits?.cast ?? []
  )
    .slice(0, 6)
    .map((person) => `cast:${person.name}`);

  const directors = (
    payload.credits?.crew ?? []
  )
    .filter((person) => person.job === "Director")
    .slice(0, 2)
    .map((person) => `director:${person.name}`);

  return uniqueKeywords([
    ...genres,
    ...keywords,
    ...cast,
    ...directors,
    decade,
  ]);
}

function normalizeTmdbMetadata(
  payload: TmdbMoviePayload,
): ReleaseMetadataShape {
  const imdbId =
    payload.external_ids?.imdb_id ?? null;

  return {
    original_title: payload.original_title || payload.title,
    alternative_title:
      payload.title &&
      payload.title !== payload.original_title
        ? payload.title
        : null,
    release_year: toReleaseYear(
      payload.release_date,
    ),
    imdb_url: normalizeImdbUrl(imdbId),
    overview: payload.overview?.trim() || null,
    runtime_minutes:
      typeof payload.runtime === "number" &&
      payload.runtime > 0
        ? Math.round(payload.runtime)
        : null,
    genres: (payload.genres ?? [])
      .map((genre) => genre.name?.trim() || "")
      .filter(Boolean),
    auto_keywords: keywordsFromTmdbPayload(payload),
    metadata_provider: "tmdb",
    metadata_provider_id: String(payload.id),
    metadata_last_enriched_at:
      new Date().toISOString(),
    keywords_source: "tmdb",
    keywords_updated_at:
      new Date().toISOString(),
  };
}

function shouldAssignField(
  field: keyof ReleaseMetadataShape,
  current: ReleaseMetadataShape,
  options?: EnrichmentOptions,
) {
  if (options?.force) {
    return true;
  }

  if (
    metadataManualFieldNames.includes(
      field as MetadataManualField,
    ) &&
    options?.protectedFields?.includes(
      field as MetadataManualField,
    )
  ) {
    return false;
  }

  return !isFilled(current[field] ?? null);
}

function pickBestSearchResult(
  results: Array<{
    id: number;
    release_date?: string;
  }>,
  releaseYear?: number | null,
) {
  if (!results.length) {
    return null;
  }

  if (releaseYear) {
    const exactYear = results.find(
      (result) =>
        toReleaseYear(result.release_date) ===
        releaseYear,
    );

    if (exactYear) {
      return exactYear;
    }
  }

  return results[0];
}

async function resolveTmdbMovieId(
  input: EnrichDvdMetadataInput,
  token: string,
) {
  if (input.tmdbId && input.tmdbId > 0) {
    return input.tmdbId;
  }

  if (
    input.provider === "tmdb" &&
    input.providerId &&
    /^\d+$/.test(input.providerId)
  ) {
    return Number(input.providerId);
  }

  const imdbId =
    input.imdbId || parseImdbId(input.imdbUrl);

  if (imdbId) {
    const payload = await tmdbFetch<{
      movie_results?: Array<{ id: number }>;
    }>(`/find/${encodeURIComponent(imdbId)}`, token, {
      external_source: "imdb_id",
      language: "nb-NO",
    });

    const foundId =
      payload.movie_results?.[0]?.id;

    if (foundId) {
      return foundId;
    }
  }

  if (!input.title?.trim()) {
    return null;
  }

  const payload = await tmdbFetch<{
    results?: Array<{
      id: number;
      release_date?: string;
    }>;
  }>("/search/movie", token, {
    query: input.title.trim(),
    language: "nb-NO",
    include_adult: "false",
    year: input.releaseYear ?? undefined,
    page: 1,
  });

  return pickBestSearchResult(
    payload.results ?? [],
    input.releaseYear,
  )?.id ?? null;
}

/**
 * Fetch and normalize DVD metadata from TMDB using the
 * best available identifiers (TMDB id, IMDb id/url, or
 * title + release year).
 */
export async function fetchEnrichedDvdMetadata(
  input: EnrichDvdMetadataInput,
) {
  const token = getTmdbToken();
  const tmdbId = await resolveTmdbMovieId(
    input,
    token,
  );

  if (!tmdbId) {
    throw new Error("Fant ingen metadata for filmen");
  }

  const payload = await tmdbFetch<TmdbMoviePayload>(
    `/movie/${tmdbId}`,
    token,
    {
      language: "nb-NO",
      append_to_response:
        "keywords,credits,external_ids",
    },
  );

  return {
    provider: "tmdb",
    providerId: String(tmdbId),
    payload,
    metadata: normalizeTmdbMetadata(payload),
  };
}

/**
 * Merge fetched metadata into an existing release-like
 * payload. By default only missing fields are filled, and
 * explicitly manual fields stay untouched unless force is set.
 */
export async function enrichDvdMetadata(
  current: ReleaseMetadataShape,
  input: EnrichDvdMetadataInput,
  options?: EnrichmentOptions,
): Promise<EnrichmentResult> {
  const fetched =
    await fetchEnrichedDvdMetadata(input);

  const merged: ReleaseMetadataShape = {
    ...current,
    metadata_provider: fetched.provider,
    metadata_provider_id: fetched.providerId,
  };

  const changedFields: string[] = [];

  (
    Object.keys(fetched.metadata) as Array<
      keyof ReleaseMetadataShape
    >
  ).forEach((field) => {
    const value = fetched.metadata[field];

    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return;
    }

    if (
      !shouldAssignField(field, merged, options)
    ) {
      return;
    }

    const currentValue = merged[field];
    const nextValue = value;

    const isDifferent = Array.isArray(currentValue) ||
      Array.isArray(nextValue)
      ? JSON.stringify(currentValue ?? []) !==
        JSON.stringify(nextValue ?? [])
      : currentValue !== nextValue;

    if (!isDifferent) {
      return;
    }

    merged[field] = nextValue;
    changedFields.push(field);
  });

  if (
    fetched.metadata.auto_keywords &&
    (options?.force ||
      !isFilled(current.auto_keywords))
  ) {
    merged.auto_keywords =
      fetched.metadata.auto_keywords;
    changedFields.push("auto_keywords");
  }

  if (
    fetched.metadata.keywords_source &&
    (options?.force ||
      !isFilled(current.keywords_source))
  ) {
    merged.keywords_source =
      fetched.metadata.keywords_source;
  }

  if (
    fetched.metadata.keywords_updated_at &&
    (options?.force ||
      !isFilled(current.keywords_updated_at))
  ) {
    merged.keywords_updated_at =
      fetched.metadata.keywords_updated_at;
  }

  merged.metadata_provider = fetched.provider;
  merged.metadata_provider_id = fetched.providerId;
  merged.metadata_last_enriched_at =
    fetched.metadata.metadata_last_enriched_at ??
    new Date().toISOString();

  return {
    metadata: merged,
    changedFields: [...new Set(changedFields)],
    provider: fetched.provider,
    providerId: fetched.providerId,
    raw: fetched.payload as Record<string, unknown>,
  };
}

export function getMissingMetadataFields(
  release: ReleaseMetadataShape,
) {
  const missing: MetadataManualField[] = [];

  for (const field of metadataManualFieldNames) {
    if (!isFilled(release[field] ?? null)) {
      missing.push(field);
    }
  }

  return missing;
}
