import { parseImdbId, uniqueKeywords } from "@/lib/keyword-utils";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

type CacheRow = {
  imdb_id: string;
  source: string;
  payload: Record<string, unknown>;
  fetched_at: string;
};

type ReleaseForEnrichment = {
  id: string;
  imdb_url: string | null;
};

function getTmdbToken() {
  return process.env.TMDB_READ_ACCESS_TOKEN ?? null;
}

async function tmdbFetch(path: string, token: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + token,
      accept: "application/json",
    },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) throw new Error(`TMDB ${response.status}`);
  return response.json();
}

function keywordsFromTmdbPayload(payload: any) {
  const year = typeof payload.release_date === "string" ? Number(payload.release_date.slice(0, 4)) : null;
  const decade = year ? `${Math.floor(year / 10) * 10}s` : null;
  const genres = (payload.genres ?? []).map((g: any) => `genre:${g.name}`);
  const keywordNodes = payload.keywords?.keywords ?? payload.keywords?.results ?? [];
  const keywords = keywordNodes.map((k: any) => `theme:${k.name}`);
  const cast = (payload.credits?.cast ?? []).slice(0, 6).map((c: any) => `cast:${c.name}`);
  const directors = (payload.credits?.crew ?? [])
    .filter((c: any) => c.job === "Director")
    .slice(0, 2)
    .map((c: any) => `director:${c.name}`);
  return uniqueKeywords([...genres, ...keywords, ...cast, ...directors, decade ? `era:${decade}` : null]);
}

export async function enrichReleaseKeywords(
  supabase: any,
  release: ReleaseForEnrichment,
  options?: { force?: boolean; staleDays?: number },
) {
  const imdbId = parseImdbId(release.imdb_url);
  if (!imdbId) return { status: "skipped-no-imdb" as const };

  const staleDays = options?.staleDays ?? 30;
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const token = getTmdbToken();
  if (!token) return { status: "skipped-missing-token" as const, imdbId };

  const { data: cachedData } = await supabase
    .from("movie_metadata_cache")
    .select("imdb_id,source,payload,fetched_at")
    .eq("imdb_id", imdbId)
    .maybeSingle();
  const cached = (cachedData ?? null) as CacheRow | null;

  let payload = cached?.payload ?? null;
  const cacheFresh = cached ? Date.now() - new Date(cached.fetched_at).getTime() < staleMs : false;

  if (!payload || options?.force || !cacheFresh) {
    const find = await tmdbFetch(`/find/${imdbId}`, token, { external_source: "imdb_id", language: "nb-NO" });
    const tmdbMovie = (find.movie_results ?? [])[0];
    if (!tmdbMovie?.id) return { status: "skipped-no-tmdb-match" as const, imdbId };

    payload = await tmdbFetch(`/movie/${tmdbMovie.id}`, token, {
      language: "nb-NO",
      append_to_response: "keywords,credits",
    });

    await supabase.from("movie_metadata_cache").upsert(
      {
        imdb_id: imdbId,
        source: "tmdb",
        payload,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "imdb_id" },
    );
  }

  const autoKeywords = keywordsFromTmdbPayload(payload);
  await supabase
    .from("releases")
    .update({
      auto_keywords: autoKeywords,
      keywords_source: "tmdb",
      keywords_updated_at: new Date().toISOString(),
    })
    .eq("id", release.id);

  return { status: "updated" as const, imdbId, autoKeywordsCount: autoKeywords.length };
}
