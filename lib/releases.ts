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
  page?: number;
};

const PAGE_SIZE = 24;
const allowedSorts = new Set(["original_title", "alternative_title", "release_year", "imdb_score", "created_at", "updated_at"]);

export async function listReleases(params: ReleaseQuery) {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, params.page || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = supabase.from("releases").select("*", { count: "exact" });

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
  const { data, error, count } = await query.order(sort, { ascending, nullsFirst: false }).range(from, to);
  if (error) {
  console.error("Supabase listReleases-feil:", error);

  throw new Error(
    `Supabase-feil ${error.code ?? "ukjent kode"}: ${error.message}` +
      (error.details ? ` – ${error.details}` : "") +
      (error.hint ? ` – Hint: ${error.hint}` : "")
  );
}

  const releases = await Promise.all((data as Release[]).map(async release => ({
    ...release,
    cover_url: release.cover_path ? (await supabase.storage.from("covers").createSignedUrl(release.cover_path, 3600)).data?.signedUrl ?? null : null,
  })));
  return { releases, count: count || 0, page, pageSize: PAGE_SIZE };
}

export async function getRelease(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("releases").select("*").eq("id", id).single();
  if (error) return null;
  const release = data as Release;
  return {
    ...release,
    cover_url: release.cover_path ? (await supabase.storage.from("covers").createSignedUrl(release.cover_path, 3600)).data?.signedUrl ?? null : null,
  } satisfies Release;
}
