import { getSupabaseAdmin } from "./supabase";
import type { Release } from "./types";

export type ReleaseQuery = {
  q?: string;
  year?: string;
  region?: string;
  edition?: string;
  scoreMin?: string;
  scoreMax?: string;
  cover?: "yes" | "no" | "";
  sort?: string;
  dir?: "asc" | "desc";
  offset?: number;
  limit?: number;
  wishlist?: boolean;
};

export const RELEASE_BATCH_SIZE = 20;
const allowedSorts = new Set(["original_title", "alternative_title", "release_year", "imdb_score", "created_at", "updated_at"]);

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("nb-NO").trim();
}

export function releaseSearchRelevance(release: Release, searchTerm: string) {
  const needle = normalizeSearchText(searchTerm);
  if (!needle) return 0;
  const originalTitle = normalizeSearchText(release.original_title);
  const alternativeTitle = normalizeSearchText(release.alternative_title);
  const edition = normalizeSearchText(release.edition);
  const notes = normalizeSearchText(release.notes);
  const terms = needle.split(/\s+/).filter(Boolean);
  let score = 0;

  if (originalTitle === needle) score += 1000;
  else if (originalTitle.startsWith(needle)) score += 800;
  else if (originalTitle.includes(needle)) score += 600;
  if (alternativeTitle === needle) score += 900;
  else if (alternativeTitle.startsWith(needle)) score += 700;
  else if (alternativeTitle.includes(needle)) score += 500;
  if (edition === needle) score += 450;
  else if (edition.includes(needle)) score += 350;
  if (notes.includes(needle)) score += 200;

  for (const term of terms) {
    if (originalTitle.includes(term)) score += 40;
    if (alternativeTitle.includes(term)) score += 30;
    if (edition.includes(term)) score += 20;
    if (notes.includes(term)) score += 10;
  }
  return score;
}

export async function listReleases(params: ReleaseQuery) {
  const supabase = getSupabaseAdmin();
  const offset = Math.max(0, params.offset || 0);
  const limit = Math.min(100, Math.max(1, params.limit || RELEASE_BATCH_SIZE));
  const to = offset + limit - 1;
  let query = supabase.from("releases").select("*", { count: "exact" });
  const searchTerm = params.q?.trim().replaceAll(",", " ") ?? "";
  const searchAcrossStatuses = Boolean(searchTerm) && params.wishlist === false;

  if (!searchAcrossStatuses) {
    query = query.eq("is_wishlist", params.wishlist ?? false);
  }
  if (searchTerm) {
    query = query.or(`original_title.ilike.%${searchTerm}%,alternative_title.ilike.%${searchTerm}%,edition.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
  }
  if (params.year) query = query.eq("release_year", Number(params.year));
  if (params.region) query = query.eq("region", params.region);
  if (params.edition) query = query.ilike("edition", `%${params.edition}%`);
  if (params.scoreMin) query = query.gte("imdb_score", Number(params.scoreMin));
  if (params.scoreMax) query = query.lte("imdb_score", Number(params.scoreMax));
  if (params.cover === "yes") query = query.not("cover_path", "is", null);
  if (params.cover === "no") query = query.is("cover_path", null);

  const sort = allowedSorts.has(params.sort || "") ? params.sort! : "created_at";
  const ascending = params.dir === "asc";
  let data: Release[];
  let count: number;

  if (searchTerm) {
    const response = await query.limit(5000);
    if (response.error) throw new Error(`Supabase-feil ${response.error.code ?? ""}: ${response.error.message}`);
    const ranked = ((response.data ?? []) as Release[])
      .map(release => ({ release, relevance: releaseSearchRelevance(release, searchTerm) }))
      .sort((a, b) => b.relevance - a.relevance || a.release.original_title.localeCompare(b.release.original_title, "nb-NO"));
    count = ranked.length;
    data = ranked.slice(offset, offset + limit).map(item => item.release);
  } else {
    const response = await query.order(sort, { ascending, nullsFirst: false }).range(offset, to);
    if (response.error) throw new Error(`Supabase-feil ${response.error.code ?? ""}: ${response.error.message}`);
    data = (response.data ?? []) as Release[];
    count = response.count ?? 0;
  }

  const releases = await Promise.all(data.map(async release => {
    const imagePath = release.thumbnail_path || release.cover_path;
    const signed = imagePath
      ? await supabase.storage.from("covers").createSignedUrl(imagePath, 3600)
      : null;
    return {
      ...release,
      thumbnail_url: signed?.data?.signedUrl ?? null,
      cover_url: signed?.data?.signedUrl ?? null,
    };
  }));

  return {
    releases,
    count,
    offset,
    limit,
    hasMore: offset + releases.length < count,
  };
}

export async function getRelease(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("releases").select("*").eq("id", id).single();
  if (error) return null;
  const release = data as Release;
  const [coverSigned, thumbSigned] = await Promise.all([
    release.cover_path ? supabase.storage.from("covers").createSignedUrl(release.cover_path, 3600) : null,
    release.thumbnail_path ? supabase.storage.from("covers").createSignedUrl(release.thumbnail_path, 3600) : null,
  ]);
  return {
    ...release,
    cover_url: coverSigned?.data?.signedUrl ?? null,
    thumbnail_url: thumbSigned?.data?.signedUrl ?? null,
  } satisfies Release;
}
import { getSupabaseAdmin } from "./supabase";
import type { Release } from "./types";

export type ReleaseQuery = {
  q?: string;
  year?: string;
  region?: string;
  edition?: string;
  scoreMin?: string;
  scoreMax?: string;
  cover?: "yes" | "no" | "";
  sort?: string;
  dir?: "asc" | "desc";
  offset?: number;
  limit?: number;
  wishlist?: boolean;
};

export const RELEASE_BATCH_SIZE = 20;
const allowedSorts = new Set(["original_title", "alternative_title", "release_year", "imdb_score", "created_at", "updated_at"]);

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("nb-NO").trim();
}

export function releaseSearchRelevance(release: Release, searchTerm: string) {
  const needle = normalizeSearchText(searchTerm);
  if (!needle) return 0;
  const originalTitle = normalizeSearchText(release.original_title);
  const alternativeTitle = normalizeSearchText(release.alternative_title);
  const edition = normalizeSearchText(release.edition);
  const notes = normalizeSearchText(release.notes);
  const terms = needle.split(/\s+/).filter(Boolean);
  let score = 0;

  if (originalTitle === needle) score += 1000;
  else if (originalTitle.startsWith(needle)) score += 800;
  else if (originalTitle.includes(needle)) score += 600;
  if (alternativeTitle === needle) score += 900;
  else if (alternativeTitle.startsWith(needle)) score += 700;
  else if (alternativeTitle.includes(needle)) score += 500;
  if (edition === needle) score += 450;
  else if (edition.includes(needle)) score += 350;
  if (notes.includes(needle)) score += 200;

  for (const term of terms) {
    if (originalTitle.includes(term)) score += 40;
    if (alternativeTitle.includes(term)) score += 30;
    if (edition.includes(term)) score += 20;
    if (notes.includes(term)) score += 10;
  }
  return score;
}

export async function listReleases(params: ReleaseQuery) {
  const supabase = getSupabaseAdmin();
  const offset = Math.max(0, params.offset || 0);
  const limit = Math.min(100, Math.max(1, params.limit || RELEASE_BATCH_SIZE));
  const to = offset + limit - 1;
  let query = supabase.from("releases").select("*", { count: "exact" });
  const searchTerm = params.q?.trim().replaceAll(",", " ") ?? "";
  const searchAcrossStatuses = Boolean(searchTerm) && params.wishlist === false;

  if (!searchAcrossStatuses) {
    query = query.eq("is_wishlist", params.wishlist ?? false);
  }
  if (searchTerm) {
    query = query.or(`original_title.ilike.%${searchTerm}%,alternative_title.ilike.%${searchTerm}%,edition.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
  }
  if (params.year) query = query.eq("release_year", Number(params.year));
  if (params.region) query = query.eq("region", params.region);
  if (params.edition) query = query.ilike("edition", `%${params.edition}%`);
  if (params.scoreMin) query = query.gte("imdb_score", Number(params.scoreMin));
  if (params.scoreMax) query = query.lte("imdb_score", Number(params.scoreMax));
  if (params.cover === "yes") query = query.not("cover_path", "is", null);
  if (params.cover === "no") query = query.is("cover_path", null);

  const sort = allowedSorts.has(params.sort || "") ? params.sort! : "created_at";
  const ascending = params.dir === "asc";
  let data: Release[];
  let count: number;

  if (searchTerm) {
    const response = await query.limit(5000);
    if (response.error) throw new Error(`Supabase-feil ${response.error.code ?? ""}: ${response.error.message}`);
    const ranked = ((response.data ?? []) as Release[])
      .map(release => ({ release, relevance: releaseSearchRelevance(release, searchTerm) }))
      .sort((a, b) => b.relevance - a.relevance || a.release.original_title.localeCompare(b.release.original_title, "nb-NO"));
    count = ranked.length;
    data = ranked.slice(offset, offset + limit).map(item => item.release);
  } else {
    const response = await query.order(sort, { ascending, nullsFirst: false }).range(offset, to);
    if (response.error) throw new Error(`Supabase-feil ${response.error.code ?? ""}: ${response.error.message}`);
    data = (response.data ?? []) as Release[];
    count = response.count ?? 0;
  }

  const releases = await Promise.all(data.map(async release => {
    const imagePath = release.thumbnail_path || release.cover_path;
    const signed = imagePath
      ? await supabase.storage.from("covers").createSignedUrl(imagePath, 3600)
      : null;
    return {
      ...release,
      thumbnail_url: signed?.data?.signedUrl ?? null,
      cover_url: signed?.data?.signedUrl ?? null,
    };
  }));

  return {
    releases,
    count,
    offset,
    limit,
    hasMore: offset + releases.length < count,
  };
}

export async function getRelease(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("releases").select("*").eq("id", id).single();
  if (error) return null;
  const release = data as Release;
  const [coverSigned, thumbSigned] = await Promise.all([
    release.cover_path ? supabase.storage.from("covers").createSignedUrl(release.cover_path, 3600) : null,
    release.thumbnail_path ? supabase.storage.from("covers").createSignedUrl(release.thumbnail_path, 3600) : null,
  ]);
  return {
    ...release,
    cover_url: coverSigned?.data?.signedUrl ?? null,
    thumbnail_url: thumbSigned?.data?.signedUrl ?? null,
  } satisfies Release;
}
import { getSupabaseAdmin } from "./supabase";
import type { Release } from "./types";

export type ReleaseQuery = {
  q?: string;
  year?: string;
  region?: string;
  edition?: string;
  scoreMin?: string;
  scoreMax?: string;
  cover?: "yes" | "no" | "";
  sort?: string;
  dir?: "asc" | "desc";
  offset?: number;
  limit?: number;
  wishlist?: boolean;
};

export const RELEASE_BATCH_SIZE = 20;
const allowedSorts = new Set(["original_title", "alternative_title", "release_year", "imdb_score", "created_at", "updated_at"]);

export async function listReleases(params: ReleaseQuery) {
  const supabase = getSupabaseAdmin();
  const offset = Math.max(0, params.offset || 0);
  const limit = Math.min(100, Math.max(1, params.limit || RELEASE_BATCH_SIZE));
  const to = offset + limit - 1;
  let query = supabase
    .from("releases")
    .select("*", { count: "exact" })
    .eq("is_wishlist", params.wishlist ?? false);

  if (params.q?.trim()) {
    const q = params.q.trim().replaceAll(",", " ");
    query = query.or(`original_title.ilike.%${q}%,alternative_title.ilike.%${q}%,edition.ilike.%${q}%,notes.ilike.%${q}%`);
  }
  if (params.year) query = query.eq("release_year", Number(params.year));
  if (params.region) query = query.eq("region", params.region);
  if (params.edition) query = query.ilike("edition", `%${params.edition}%`);
  if (params.scoreMin) query = query.gte("imdb_score", Number(params.scoreMin));
  if (params.scoreMax) query = query.lte("imdb_score", Number(params.scoreMax));
  if (params.cover === "yes") query = query.not("cover_path", "is", null);
  if (params.cover === "no") query = query.is("cover_path", null);

  const sort = allowedSorts.has(params.sort || "") ? params.sort! : "created_at";
  const ascending = params.dir === "asc";
  const { data, error, count } = await query.order(sort, { ascending, nullsFirst: false }).range(offset, to);
  if (error) throw new Error(`Supabase-feil ${error.code ?? ""}: ${error.message}`);

  const releases = await Promise.all((data as Release[]).map(async release => {
    const imagePath = release.thumbnail_path || release.cover_path;
    const signed = imagePath
      ? await supabase.storage.from("covers").createSignedUrl(imagePath, 3600)
      : null;
    return {
      ...release,
      thumbnail_url: signed?.data?.signedUrl ?? null,
      cover_url: signed?.data?.signedUrl ?? null,
    };
  }));

  return {
    releases,
    count: count || 0,
    offset,
    limit,
    hasMore: offset + releases.length < (count || 0),
  };
}

export async function getRelease(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("releases").select("*").eq("id", id).single();
  if (error) return null;
  const release = data as Release;
  const [coverSigned, thumbSigned] = await Promise.all([
    release.cover_path ? supabase.storage.from("covers").createSignedUrl(release.cover_path, 3600) : null,
    release.thumbnail_path ? supabase.storage.from("covers").createSignedUrl(release.thumbnail_path, 3600) : null,
  ]);
  return {
    ...release,
    cover_url: coverSigned?.data?.signedUrl ?? null,
    thumbnail_url: thumbSigned?.data?.signedUrl ?? null,
  } satisfies Release;
}
