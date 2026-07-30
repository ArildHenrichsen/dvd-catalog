import { createClient } from "@supabase/supabase-js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL og SUPABASE_SECRET_KEY må finnes i miljøet");
}
if (!tmdbToken) {
  throw new Error("TMDB_READ_ACCESS_TOKEN må finnes i miljøet");
}

const force = process.argv.includes("--force");
const staleDaysArg = process.argv.find(arg => arg.startsWith("--stale-days="));
const staleDays = staleDaysArg ? Math.max(1, Number(staleDaysArg.split("=")[1])) : 30;
const staleMs = staleDays * 24 * 60 * 60 * 1000;

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

const parseImdbId = (value) => value?.match(/tt\d{7,10}/i)?.[0]?.toLowerCase() ?? null;
const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['"`.,:;!?()[\]{}]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const token = (value) => normalize(value).replace(/\s+/g, "-");
const dedupe = (values) => {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const t = token(value);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
};

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url.toString(), {
    headers: { Authorization: "Bearer " + tmdbToken, accept: "application/json" },
  });
  if (!response.ok) throw new Error(`TMDB ${response.status}`);
  return response.json();
}

function keywordsFromPayload(payload) {
  const year = payload?.release_date ? Number(String(payload.release_date).slice(0, 4)) : null;
  const decade = year ? `era:${Math.floor(year / 10) * 10}s` : null;
  const genres = (payload?.genres ?? []).map(g => `genre:${g.name}`);
  const keywords = (payload?.keywords?.keywords ?? payload?.keywords?.results ?? []).map(k => `theme:${k.name}`);
  const cast = (payload?.credits?.cast ?? []).slice(0, 6).map(person => `cast:${person.name}`);
  const directors = (payload?.credits?.crew ?? []).filter(c => c.job === "Director").slice(0, 2).map(c => `director:${c.name}`);
  return dedupe([...genres, ...keywords, ...cast, ...directors, decade]);
}

const { data: releases, error } = await supabase
  .from("releases")
  .select("id,imdb_url,keywords_updated_at")
  .eq("is_wishlist", false);
if (error) throw error;

let updated = 0;
let skipped = 0;
let failed = 0;

for (const release of releases ?? []) {
  const imdbId = parseImdbId(release.imdb_url);
  if (!imdbId) {
    skipped++;
    continue;
  }

  const isFresh =
    release.keywords_updated_at &&
    Date.now() - new Date(release.keywords_updated_at).getTime() < staleMs;
  if (isFresh && !force) {
    skipped++;
    continue;
  }

  try {
    const { data: cache } = await supabase
      .from("movie_metadata_cache")
      .select("payload,fetched_at")
      .eq("imdb_id", imdbId)
      .maybeSingle();
    const cacheFresh =
      cache?.fetched_at &&
      Date.now() - new Date(cache.fetched_at).getTime() < staleMs;

    let payload = cache?.payload ?? null;
    if (!payload || force || !cacheFresh) {
      const find = await tmdbFetch(`/find/${imdbId}`, { external_source: "imdb_id", language: "nb-NO" });
      const movie = find?.movie_results?.[0];
      if (!movie?.id) {
        skipped++;
        continue;
      }
      payload = await tmdbFetch(`/movie/${movie.id}`, { language: "nb-NO", append_to_response: "keywords,credits" });
      await supabase.from("movie_metadata_cache").upsert(
        { imdb_id: imdbId, source: "tmdb", payload, fetched_at: new Date().toISOString() },
        { onConflict: "imdb_id" },
      );
    }

    const autoKeywords = keywordsFromPayload(payload);
    const { error: updateError } = await supabase
      .from("releases")
      .update({
        auto_keywords: autoKeywords,
        keywords_source: "tmdb",
        keywords_updated_at: new Date().toISOString(),
      })
      .eq("id", release.id);
    if (updateError) throw updateError;
    updated++;
    console.log(`Oppdatert ${release.id} (${imdbId}) med ${autoKeywords.length} nøkkelord`);
  } catch (err) {
    failed++;
    console.error(`Feil for ${release.id}:`, err instanceof Error ? err.message : err);
  }
}

console.log(`Ferdig. Oppdatert=${updated}, Hoppet over=${skipped}, Feilet=${failed}`);
