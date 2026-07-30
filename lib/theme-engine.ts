import { getSupabaseAdmin } from "./supabase";
import { THEMES, MovieTheme } from "./theme";
import type { Release } from "./types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

function parseImdbId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/tt\d{7,8}/);
  return m ? m[0] : null;
}

function normalizeTitle(title?: string | null) {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u2013\u2014–—]/g, "-")
    .replace(/["'`.,:;!()\[\]{}]/g, "")
    .replace(/\b(the|a|an|en|et|den|det)\b\s*/g, "")
    .replace(/[^a-z0-9\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleYearKey(title: string | null, year: number | null) {
  return `${normalizeTitle(title)}|${year ?? ""}`;
}

// Simple in-memory cache for TMDB responses
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
      Authorization: `Bearer ${getTmdbToken()}`,
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

export async function generateMovieNight(options?: { maxThemesToTest?: number }) {
  const maxThemes = options?.maxThemesToTest ?? 12;
  const supabase = getSupabaseAdmin();

  // Fetch releases in collection (not wishlist)
  let allReleases: Release[] = [];
  try {
    const { data: releases, error } = await supabase
      .from("releases")
      .select(
        "id,original_title,alternative_title,release_year,imdb_score,imdb_url,cover_url,thumbnail_url,cover_path,thumbnail_path,is_wishlist,created_at,updated_at",
      )
      .eq("is_wishlist", false);

    if (error) {
      console.error("Supabase-feil ved henting av releases:", error);
      return {
        success: false as const,
        message: "Klarte ikke hente samlingen fra databasen.",
        error: { message: error.message ?? String(error), details: (error as any).details ?? null },
      };
    }

    // Normalize so we always have cover_url/thumbnail_url fields (prefer explicit URL, fallback to stored path)
    allReleases = ((releases ?? []) as any[]).map(r => ({
      ...r,
      cover_url: r.cover_url ?? r.cover_path ?? null,
      thumbnail_url: r.thumbnail_url ?? r.thumbnail_path ?? null,
    })) as Release[];
  } catch (ex) {
    console.error("Exception ved henting av releases fra Supabase:", ex);
    return {
      success: false as const,
      message: "Klarte ikke hente samlingen fra databasen.",
      error: { message: (ex as Error).message ?? String(ex) },
    };
  }

  // Build lookup maps
  const imdbMap = new Map<string, Release[]>();
  const titleYearMap = new Map<string, Release[]>();

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

  // Shuffle themes
  const themes = [...THEMES].sort(() => Math.random() - 0.5);

  let tested = 0;
  for (const theme of themes) {
    if (tested >= maxThemes) break;
    tested++;

    try {
      let matched: Array<{ release: Release; reason: string }> = [];
      const extraSet = new Map<string, Release>();

      if (theme.source === "collection" && theme.collectionQuery) {
        // Filter by collectionQuery
        matched = allReleases
          .filter(r => {
            const y = r.release_year;
            if (theme.collectionQuery?.yearFrom && (y ?? 0) < theme.collectionQuery.yearFrom) return false;
            if (theme.collectionQuery?.yearTo && (y ?? 0) > theme.collectionQuery.yearTo) return false;
            if (
              theme.collectionQuery?.minimumImdbScore !== undefined &&
              (r.imdb_score ?? 0) < (theme.collectionQuery.minimumImdbScore ?? -Infinity)
            )
              return false;
            if (
              theme.collectionQuery?.maximumImdbScore !== undefined &&
              (r.imdb_score ?? 0) > (theme.collectionQuery.maximumImdbScore ?? Infinity)
            )
              return false;
            return true;
          })
          .map(r => ({ release: r, reason: `Matcher samlingsregel (${theme.id})` }));

        // requireSameDecade handling: group by decade
        if (theme.collectionQuery?.requireSameDecade) {
          // find decades with at least 2 films
          const byDecade = new Map<number, Release[]>();
          for (const r of matched.map(m => m.release)) {
            const decade = Math.floor(((r.release_year ?? 0) || 0) / 10) * 10;
            const arr = byDecade.get(decade) ?? [];
            arr.push(r);
            byDecade.set(decade, arr);
          }
          // pick any decade with >=2
          let found: Release[] | null = null;
          for (const arr of byDecade.values()) {
            if (arr.length >= 2) {
              found = arr;
              break;
            }
          }
          if (!found) {
            matched = [];
          } else {
            matched = found.slice(0, 10).map(r => ({ release: r, reason: `Samme tiår (${Math.floor(((r.release_year ?? 0) || 0) / 10) * 10}s)` }));
          }
        }
      } else if (theme.source === "curated" && theme.curatedImdbIds && theme.curatedImdbIds.length) {
        // intersect curated IMDB ids with collection
        for (const imdb of theme.curatedImdbIds) {
          const found = imdbMap.get(imdb);
          if (found) {
            for (const r of found) {
              matched.push({ release: r, reason: `Kurert liste (IMDb ${imdb})` });
              extraSet.set(r.id, r);
            }
          }
        }
      } else if (theme.source === "tmdb" && theme.tmdbQuery) {
        // TMDB-based: perform searches depending on tmdbQuery
        let movies: any[] = [];

        // If person is set, search person -> get movie credits
        if (theme.tmdbQuery.person) {
          try {
            const personSearch = await tmdbFetch('/search/person', { query: theme.tmdbQuery.person, language: 'nb-NO', page: 1 });
            const person = (personSearch.results ?? [])[0];
            if (person && person.id) {
              const credits = await tmdbFetch(`/person/${person.id}/movie_credits`, { language: 'nb-NO' });
              movies = (credits.cast ?? []).concat(credits.crew ?? []);
            }
          } catch (e) {
            console.error('TMDB person search failed', e);
          }
        }

        // If no movies yet, fallback to search/movie with query or keywords
        if (!movies.length) {
          const keywordsJoined = (theme.tmdbQuery.keywords ?? []).join(" ");
          const query = (theme.tmdbQuery.query ?? keywordsJoined) || "";
          try {
            const payload = await tmdbFetch('/search/movie', { query: query || 'a', language: 'nb-NO', page: 1 });
            movies = payload.results ?? [];
          } catch (e) {
            console.error('TMDB movie search failed', e);
            movies = [];
          }
        }

        // limit movies
        const limit = theme.tmdbQuery.limit ?? 12;
        movies = movies.slice(0, limit);

        // Try matching by normalized title+year first
        for (const m of movies) {
          const y = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
          const key = titleYearKey(m.original_title ?? m.title, y);
          const found = titleYearMap.get(key);
          if (found) {
            for (const r of found) {
              if (!extraSet.has(r.id)) {
                matched.push({ release: r, reason: `TMDB: matcher tittel/år (${m.original_title ?? m.title}${y ? `, ${y}` : ''})` });
                extraSet.set(r.id, r);
              }
            }
          }
        }

        // If still not enough matches, attempt to match by IMDb ID via TMDB external ids (costly, so only if needed)
        if (matched.length < 2) {
          for (const m of movies) {
            try {
              const ext = await tmdbFetch(`/movie/${m.id}/external_ids`, { language: 'nb-NO' });
              const imdb_id = ext.imdb_id as string | undefined | null;
              if (imdb_id) {
                const found = imdbMap.get(imdb_id);
                if (found) {
                  for (const r of found) {
                    if (!extraSet.has(r.id)) {
                      matched.push({ release: r, reason: `TMDB: IMDb-match (${imdb_id})` });
                      extraSet.set(r.id, r);
                    }
                  }
                }
              }
            } catch (e) {
              console.error('TMDB external ids fetch failed', e);
            }
            if (matched.length >= 2) break;
          }
        }
      }

      // Remove duplicates and ensure at least 2
      const unique = new Map<string, { release: Release; reason: string }>();
      for (const m of matched) {
        if (!unique.has(m.release.id)) unique.set(m.release.id, m);
      }

      const results = Array.from(unique.values());

      if (results.length >= 2) {
        // Prepare extras as additional matched releases beyond the two chosen
        const releasesOnly = results.map(r => r.release);
        // Choose two random distinct
        const shuffled = releasesOnly.sort(() => Math.random() - 0.5);
        const chosen = shuffled.slice(0, 2);
        const chosenWithReason = chosen.map(r => {
          const reason = results.find(x => x.release.id === r.id)?.reason ?? "Matcher temaet";
          return { release: r, reason };
        });

        const extras = shuffled.slice(2);

        return {
          success: true as const,
          theme,
          films: chosenWithReason,
          totalMatches: results.length,
          extras,
        };
      }

    } catch (e) {
      console.error('Feil ved testing av tema', theme.id, e);
      // try next theme
    }
  }

  return { success: false as const, message: "Fant ingen temaer med minst to treff i samlingen." };
}
