import { getSupabaseAdmin } from "./supabase";
import { THEMES, MovieTheme } from "./theme";
import type { Release } from "./types";
import { effectiveKeywords, parseImdbId, pickBestDiversePair } from "@/lib/keyword-utils";
import { enrichReleaseKeywords } from "@/lib/keyword-enrichment";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

function normalizeTitle(title?: string | null) {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u2013\u2014–—]/g, "-")
    .replace(/[\"'`.,:;!()\[\]{}]/g, "")
    .replace(/\b(the|a|an|en|et|den|det)\b\s*/g, "")
    .replace(/[^a-z0-9\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleYearKey(title: string | null, year: number | null) {
  return `${normalizeTitle(title)}|${year ?? ""}`;
}

const tmdbCache = new Map<string, { expires: number; data: any }>();
function tmdbCacheGet(key: string) {
  const entry = tmdbCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    tmdbCache.delete(key);
    return null;
  }
  return entry.data;
}
function tmdbCacheSet(key: string, data: any, ttlSeconds = 60 * 60 * 6) {
  tmdbCache.set(key, { expires: Date.now() + ttlSeconds * 1000, data });
}

function getTmdbToken() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN mangler på serveren");
  return token;
}

async function tmdbFetch(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }

  const cacheKey = url.toString();
  const cached = tmdbCacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + getTmdbToken(),
      accept: "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TMDB feil ${res.status}: ${txt}`);
  }
  const data = await res.json();
  tmdbCacheSet(cacheKey, data);
  return data;
}

export type ThemeMatch = {
  theme: MovieTheme;
  matched: Array<{ release: Release; reason: string }>;
  extras: Release[];
};

type HistoryRow = {
  theme_id: string;
  keywords: string[] | null;
  release_ids: string[] | null;
  created_at: string;
};

type ReleaseWithKeywords = Release & {
  auto_keywords?: string[] | null;
  manual_keywords?: string[] | null;
  keywords_source?: string | null;
  keywords_updated_at?: string | null;
  times_suggested?: number | null;
  last_suggested_at?: string | null;
  theme_suggestion_counts?: Record<string, number> | null;
};

function scoreCandidate(
  release: ReleaseWithKeywords,
  themeId: string,
  nowMs: number,
  recentThemeCount: number,
  recentKeywordCount: Map<string, number>,
  recentlySuggestedIds: Set<string>,
) {
  const times = release.times_suggested ?? 0;
  const daysSinceLast = release.last_suggested_at
    ? (nowMs - new Date(release.last_suggested_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  let score = Math.random() * 0.7;
  if (daysSinceLast < 21) score -= 2.8 * (1 - daysSinceLast / 21);
  if (recentlySuggestedIds.has(release.id)) score -= 1.8;
  score -= Math.min(2.4, times * 0.16);
  score += 1.05 / (1 + times);
  score -= Math.min(2.2, recentThemeCount * 0.6);

  const movieThemeCount = release.theme_suggestion_counts?.[themeId] ?? 0;
  score -= Math.min(1.8, movieThemeCount * 0.4);

  const keywords = effectiveKeywords(release.manual_keywords, release.auto_keywords);
  if (keywords.length) {
    for (const keyword of keywords) {
      const count = recentKeywordCount.get(keyword) ?? 0;
      if (count > 0) score -= Math.min(1.0, count * 0.2);
      else score += 0.08;
    }
  } else {
    score += 0.06;
  }
  return { score, keywords };
}

async function persistSuggestion(
  supabase: any,
  theme: MovieTheme,
  chosen: ReleaseWithKeywords[],
  keywordSet: string[],
) {
  try {
    const nowIso = new Date().toISOString();
    await Promise.all(
      chosen.map(release => {
        const counts = { ...(release.theme_suggestion_counts ?? {}) };
        counts[theme.id] = (counts[theme.id] ?? 0) + 1;
        return supabase
          .from("releases")
          .update({
            times_suggested: (release.times_suggested ?? 0) + 1,
            last_suggested_at: nowIso,
            theme_suggestion_counts: counts,
          })
          .eq("id", release.id);
      }),
    );

    await supabase.from("movie_night_history").insert({
      theme_id: theme.id,
      theme_title: theme.title,
      release_ids: chosen.map(r => r.id),
      keywords: keywordSet,
      created_at: nowIso,
    });
  } catch (error) {
    console.error("Kunne ikke lagre forslagshistorikk:", error);
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function generateMovieNight(options?: { maxThemesToTest?: number }) {
  const maxThemes = options?.maxThemesToTest ?? 12;
  const supabase = getSupabaseAdmin();

  let allReleases: ReleaseWithKeywords[] = [];
  try {
    const { data: releases, error } = await supabase.from("releases").select("*").eq("is_wishlist", false);

    if (error) {
      console.error("Supabase-feil ved henting av releases:", error);
      return {
        success: false as const,
        message: "Klarte ikke hente samlingen fra databasen.",
        error: { message: error.message ?? String(error), details: (error as any).details ?? null },
      };
    }

    allReleases = ((releases ?? []) as any[]).map(r => ({
      ...r,
      cover_url: r.cover_url ?? r.cover_path ?? null,
      thumbnail_url: r.thumbnail_url ?? r.thumbnail_path ?? null,
    })) as ReleaseWithKeywords[];

    allReleases = await Promise.all(
      allReleases.map(async r => {
        const isFullUrl = (u?: string | null) => !!u && /^https?:\/\//i.test(u ?? "");
        if (isFullUrl(r.thumbnail_url) || isFullUrl(r.cover_url)) return r;
        const imagePath = r.thumbnail_path || r.cover_path;
        if (!imagePath) return r;
        try {
          const signed = await supabase.storage.from("covers").createSignedUrl(imagePath, 3600);
          const signedUrl = signed?.data?.signedUrl ?? null;
          return {
            ...r,
            thumbnail_url: isFullUrl(r.thumbnail_url) ? r.thumbnail_url : signedUrl ?? r.thumbnail_url,
            cover_url: isFullUrl(r.cover_url) ? r.cover_url : signedUrl ?? r.cover_url,
          } as ReleaseWithKeywords;
        } catch (e) {
          console.error("Kunne ikke opprette signed URL for cover:", e);
          return r;
        }
      }),
    );
  } catch (ex) {
    console.error("Exception ved henting av releases fra Supabase:", ex);
    return {
      success: false as const,
      message: "Klarte ikke hente samlingen fra databasen.",
      error: { message: (ex as Error).message ?? String(ex) },
    };
  }

  const releasesNeedingKeywords = allReleases
    .filter(r => parseImdbId(r.imdb_url) && (!r.auto_keywords || r.auto_keywords.length === 0))
    .slice(0, 3);
  if (releasesNeedingKeywords.length) {
    await Promise.all(
      releasesNeedingKeywords.map(async release => {
        try {
          await enrichReleaseKeywords(supabase, release, { staleDays: 30 });
        } catch (error) {
          console.error("Keyword enrichment feilet:", error);
        }
      }),
    );
    for (const release of releasesNeedingKeywords) {
      const { data } = await supabase
        .from("releases")
        .select("auto_keywords,keywords_source,keywords_updated_at")
        .eq("id", release.id)
        .maybeSingle();
      if (data) {
        release.auto_keywords = data.auto_keywords ?? [];
        release.keywords_source = data.keywords_source ?? null;
        release.keywords_updated_at = data.keywords_updated_at ?? null;
      }
    }
  }

  const imdbMap = new Map<string, ReleaseWithKeywords[]>();
  const titleYearMap = new Map<string, ReleaseWithKeywords[]>();

  for (const r of allReleases) {
    const imdbId = parseImdbId(r.imdb_url);
    if (imdbId) {
      const arr = imdbMap.get(imdbId) ?? [];
      arr.push(r);
      imdbMap.set(imdbId, arr);
    }
    const key = titleYearKey(r.original_title, r.release_year);
    const arr2 = titleYearMap.get(key) ?? [];
    arr2.push(r);
    titleYearMap.set(key, arr2);
  }

  const recentKeywordCount = new Map<string, number>();
  const recentThemeCount = new Map<string, number>();
  const recentlySuggestedIds = new Set<string>();
  try {
    const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
    const { data: historyRows } = await supabase
      .from("movie_night_history")
      .select("theme_id,keywords,release_ids,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    for (const row of (historyRows ?? []) as HistoryRow[]) {
      recentThemeCount.set(row.theme_id, (recentThemeCount.get(row.theme_id) ?? 0) + 1);
      for (const keyword of row.keywords ?? []) {
        recentKeywordCount.set(keyword, (recentKeywordCount.get(keyword) ?? 0) + 1);
      }
      for (const releaseId of row.release_ids ?? []) recentlySuggestedIds.add(releaseId);
    }
  } catch (error) {
    console.error("Kunne ikke lese movie_night_history, fortsetter uten historikk:", error);
  }

  const themes = shuffleArray(THEMES);
  let tested = 0;

  for (const theme of themes) {
    if (tested >= maxThemes) break;
    tested++;

    try {
      let matched: Array<{ release: ReleaseWithKeywords; reason: string }> = [];
      const extraSet = new Map<string, ReleaseWithKeywords>();

      if (theme.source === "collection" && theme.collectionQuery) {
        matched = allReleases
          .filter(r => {
            const y = r.release_year;
            if (theme.collectionQuery?.yearFrom && (y ?? 0) < theme.collectionQuery.yearFrom) return false;
            if (theme.collectionQuery?.yearTo && (y ?? 0) > theme.collectionQuery.yearTo) return false;
            if (theme.collectionQuery?.minimumImdbScore !== undefined && (r.imdb_score ?? 0) < (theme.collectionQuery.minimumImdbScore ?? -Infinity))
              return false;
            if (theme.collectionQuery?.maximumImdbScore !== undefined && (r.imdb_score ?? 0) > (theme.collectionQuery.maximumImdbScore ?? Infinity))
              return false;
            return true;
          })
          .map(r => ({ release: r, reason: `Matcher samlingsregel (${theme.id})` }));

        if (theme.collectionQuery?.requireSameDecade) {
          const byDecade = new Map<number, ReleaseWithKeywords[]>();
          for (const r of matched.map(m => m.release)) {
            const decade = Math.floor(((r.release_year ?? 0) || 0) / 10) * 10;
            const arr = byDecade.get(decade) ?? [];
            arr.push(r);
            byDecade.set(decade, arr);
          }
          let found: ReleaseWithKeywords[] | null = null;
          for (const arr of byDecade.values()) {
            if (arr.length >= 2) {
              found = arr;
              break;
            }
          }
          if (!found) matched = [];
          else {
            matched = found.slice(0, 10).map(r => ({
              release: r,
              reason: `Samme tiår (${Math.floor(((r.release_year ?? 0) || 0) / 10) * 10}s)`,
            }));
          }
        }
      } else if (theme.source === "tmdb" && theme.tmdbQuery) {
        let movies: any[] = [];
        if (theme.tmdbQuery.person) {
          try {
            const personSearch = await tmdbFetch("/search/person", { query: theme.tmdbQuery.person, language: "nb-NO", page: 1 });
            const person = (personSearch.results ?? [])[0];
            if (person?.id) {
              const credits = await tmdbFetch(`/person/${person.id}/movie_credits`, { language: "nb-NO" });
              movies = (credits.cast ?? []).concat(credits.crew ?? []);
            }
          } catch (e) {
            console.error("TMDB person search failed", e);
          }
        }

        if (!movies.length) {
          const keywordsJoined = (theme.tmdbQuery.keywords ?? []).join(" ");
          const query = (theme.tmdbQuery.query ?? keywordsJoined) || "";
          try {
            const payload = await tmdbFetch("/search/movie", { query: query || "a", language: "nb-NO", page: 1 });
            movies = payload.results ?? [];
          } catch (e) {
            console.error("TMDB movie search failed", e);
            movies = [];
          }
        }

        movies = shuffleArray(movies);
        const limit = Math.min(theme.tmdbQuery.limit ?? 12, movies.length);
        movies = movies.slice(0, limit);

        for (const m of movies) {
          const y = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
          const key = titleYearKey(m.original_title ?? m.title, y);
          const found = titleYearMap.get(key);
          if (!found) continue;
          for (const r of shuffleArray(found)) {
            if (extraSet.has(r.id)) continue;
            matched.push({ release: r, reason: `TMDB: matcher tittel/år (${m.original_title ?? m.title}${y ? `, ${y}` : ""})` });
            extraSet.set(r.id, r);
          }
        }

        if (matched.length < 4) {
          for (const m of movies) {
            try {
              const ext = await tmdbFetch(`/movie/${m.id}/external_ids`, { language: "nb-NO" });
              const imdbId = parseImdbId(ext.imdb_id);
              if (!imdbId) continue;
              const found = imdbMap.get(imdbId);
              if (!found) continue;
              for (const r of shuffleArray(found)) {
                if (extraSet.has(r.id)) continue;
                matched.push({ release: r, reason: `TMDB: IMDb-match (${imdbId})` });
                extraSet.set(r.id, r);
              }
            } catch (e) {
              console.error("TMDB external ids fetch failed", e);
            }
            if (matched.length >= 6) break;
          }
        }
      }

      const unique = new Map<string, { release: ReleaseWithKeywords; reason: string }>();
      for (const m of shuffleArray(matched)) {
        if (!unique.has(m.release.id)) unique.set(m.release.id, m);
      }

      const results = shuffleArray(Array.from(unique.values()));
      if (results.length >= 2) {
        const nowMs = Date.now();
        const themePenalty = recentThemeCount.get(theme.id) ?? 0;
        const candidates = results.map(item => {
          const scored = scoreCandidate(item.release, theme.id, nowMs, themePenalty, recentKeywordCount, recentlySuggestedIds);
          return {
            ...item,
            score: scored.score,
            keywords: scored.keywords,
          };
        });
        candidates.sort((a, b) => b.score - a.score);

        const poolSize = Math.max(4, Math.min(20, candidates.length));
        const topPool = candidates.slice(0, poolSize);
        const randomizedPool = shuffleArray(topPool).slice(0, Math.max(3, Math.min(10, topPool.length)));

        const pair = pickBestDiversePair(randomizedPool.map(c => ({ id: c.release.id, score: c.score, keywords: c.keywords })));

        const pickedIds = pair ? new Set([pair[0].id, pair[1].id]) : new Set(randomizedPool.slice(0, 2).map(p => p.release.id));
        const chosen = shuffleArray(candidates.filter(c => pickedIds.has(c.release.id))).slice(0, 2);
        if (chosen.length < 2) continue;
        const extras = shuffleArray(candidates.filter(c => !pickedIds.has(c.release.id)).map(c => c.release));
        const keywordSet = Array.from(new Set(chosen.flatMap(c => c.keywords)));
        await persistSuggestion(
          supabase,
          theme,
          chosen.map(c => c.release),
          keywordSet,
        );

        return {
          success: true as const,
          theme,
          films: chosen.map(c => ({ release: c.release, reason: c.reason })),
          totalMatches: results.length,
          extras,
        };
      }
    } catch (e) {
      console.error("Feil ved testing av tema", theme.id, e);
    }
  }

  return { success: false as const, message: "Fant ingen temaer med minst to treff i samlingen." };
}
