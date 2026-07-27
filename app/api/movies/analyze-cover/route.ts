import { NextResponse } from "next/server";
import sharp from "sharp";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  findTmdbMovieByImdbId,
  getTmdbMovieById,
  searchTmdbMovies,
  type MovieSuggestion,
} from "@/lib/tmdb";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_RESULT_RANK = 520;

const GENERIC_LABELS = new Set([
  "dvd",
  "dvd cover",
  "film",
  "movie",
  "poster",
  "cinema",
  "compact disc",
  "product",
  "actor",
  "actress",
]);

type VisionImageMatch = { url?: string; score?: number };
type VisionPageMatch = { url?: string; pageTitle?: string; fullMatchingImages?: VisionImageMatch[]; partialMatchingImages?: VisionImageMatch[] };
type VisionWebDetection = {
  bestGuessLabels?: Array<{ label?: string }>;
  webEntities?: Array<{ entityId?: string; score?: number; description?: string }>;
  fullMatchingImages?: VisionImageMatch[];
  partialMatchingImages?: VisionImageMatch[];
  visuallySimilarImages?: VisionImageMatch[];
  pagesWithMatchingImages?: VisionPageMatch[];
};

type VisionResponse = {
  responses?: Array<{
    webDetection?: VisionWebDetection;
    textAnnotations?: Array<{ description?: string }>;
    error?: { code?: number; message?: string };
  }>;
};

type QueryCandidate = {
  query: string;
  reason: string;
  weight: number;
  source: "page" | "visual" | "ocr";
};

type RankedMovie = MovieSuggestion & {
  rank: number;
  direct: boolean;
  evidenceCount: number;
};

function cleanCandidate(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+[|–—-]\s+(IMDb|Amazon|eBay|Wikipedia|TMDB|Blu-ray\.com).*$/i, "")
    .replace(/\b(DVD|Blu[ -]?ray|Collector'?s Edition|Special Edition|Region [0-9A-C])\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9æøå]+/gi, " ")
    .trim();
}

function titleSimilarity(query: string, movie: MovieSuggestion) {
  const q = normalize(query);
  if (!q) return 0;

  const titles = [movie.original_title, movie.alternative_title || ""]
    .map(normalize)
    .filter(Boolean);

  if (titles.includes(q)) return 150;

  const qTokens = new Set(q.split(/\s+/).filter(token => token.length > 1));
  let best = 0;

  for (const title of titles) {
    if (title.includes(q) || q.includes(title)) best = Math.max(best, 105);
    const titleTokens = new Set(title.split(/\s+/).filter(token => token.length > 1));
    const overlap = [...qTokens].filter(token => titleTokens.has(token)).length;
    const union = new Set([...qTokens, ...titleTokens]).size || 1;
    best = Math.max(best, (overlap / union) * 100);
  }

  return best;
}

function extractImdbEvidence(web: VisionWebDetection) {
  const evidence = new Map<string, number | null>();

  for (const page of web.pagesWithMatchingImages ?? []) {
    const text = `${page.url ?? ""} ${page.pageTitle ?? ""}`;
    const ids = text.match(/tt\d{7,10}/g) ?? [];
    const scoreMatch =
      /IMDb[^0-9]{0,30}(10(?:\.0)?|[0-9](?:\.[0-9])?)(?:\s*\/\s*10)?/i.exec(text) ??
      /(10(?:\.0)?|[0-9](?:\.[0-9])?)\s*\/\s*10[^A-Za-z]{0,20}IMDb/i.exec(text);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;

    for (const id of ids) {
      if (!evidence.has(id) || score !== null) evidence.set(id, score);
    }
  }

  return [...evidence.entries()].slice(0, 5).map(([id, score]) => ({ id, score }));
}

function extractTmdbIds(web: VisionWebDetection) {
  const ids = new Set<number>();
  const pattern = /themoviedb\.org\/movie\/(\d+)/gi;

  for (const page of web.pagesWithMatchingImages ?? []) {
    const text = `${page.url ?? ""} ${page.pageTitle ?? ""}`;
    for (const match of text.matchAll(pattern)) {
      const id = Number(match[1]);
      if (Number.isInteger(id) && id > 0) ids.add(id);
    }
  }

  return [...ids].slice(0, 5);
}

function extractWebQueries(web: VisionWebDetection) {
  const candidates: QueryCandidate[] = [];

  for (const page of web.pagesWithMatchingImages ?? []) {
    if (!page.pageTitle) continue;
    const query = cleanCandidate(page.pageTitle);
    if (query.length >= 3) {
      candidates.push({ query, reason: "Side med matchende bilde", weight: 4.5, source: "page" });
    }
  }

  for (const label of web.bestGuessLabels ?? []) {
    if (!label.label) continue;
    const query = cleanCandidate(label.label);
    if (query.length >= 2 && !GENERIC_LABELS.has(normalize(query))) {
      candidates.push({ query, reason: "Googles visuelle hovedtreff", weight: 4, source: "visual" });
    }
  }

  for (const entity of web.webEntities ?? []) {
    if (!entity.description) continue;
    const query = cleanCandidate(entity.description);
    if (query.length < 2 || GENERIC_LABELS.has(normalize(query))) continue;
    candidates.push({
      query,
      reason: "Visuell web-entitet",
      weight: 2.5 + Math.min(entity.score ?? 0, 1) * 2,
      source: "visual",
    });
  }

  const deduped = new Map<string, QueryCandidate>();
  for (const candidate of candidates.sort((a, b) => b.weight - a.weight)) {
    const key = normalize(candidate.query);
    if (!deduped.has(key)) deduped.set(key, candidate);
  }

  return [...deduped.values()].slice(0, 8);
}

function extractOcrQueries(fullText: string | undefined, webQueries: QueryCandidate[]) {
  if (!fullText) return [] as QueryCandidate[];

  const noise = /^(dvd|video|film|movie|special edition|collector.s edition|widescreen|dolby|region|disc|disk|starring|from the director|academy award|winner)$/i;
  const creditWords = /\b(starring|directed|director|producer|screenplay|music by|academy award|winner|nominee|a film by|presents)\b/i;
  const webText = normalize(webQueries.map(item => item.query).join(" "));

  const lines = fullText
    .split(/\r?\n/)
    .map(line => cleanCandidate(line))
    .filter(line => line.length >= 3 && line.length <= 80)
    .filter(line => !noise.test(line) && !creditWords.test(line))
    .filter(line => !/^\d+$/.test(line));

  const candidates: QueryCandidate[] = [];

  lines.forEach((line, index) => {
    const words = line.split(/\s+/).filter(Boolean);
    const normalizedLine = normalize(line);
    const overlapsWeb = normalizedLine
      .split(/\s+/)
      .filter(token => token.length > 2)
      .some(token => webText.includes(token));

    // Enkeltstående to-ordsnavn er ofte skuespillere. De får bare bidra
    // dersom webmatchene støtter teksten.
    const looksLikePersonName = words.length === 2 && words.every(word => /^[A-ZÆØÅ][a-zæøå'’-]+$/.test(word));
    if (looksLikePersonName && !overlapsWeb) return;

    if (words.length <= 9 && (overlapsWeb || words.length >= 3)) {
      candidates.push({
        query: line,
        reason: "Støttetekst fra coveret",
        weight: overlapsWeb ? 1.8 : 0.7,
        source: "ocr",
      });
    }

    const next = lines[index + 1];
    if (next && `${line} ${next}`.split(/\s+/).length <= 10) {
      candidates.push({
        query: `${line} ${next}`,
        reason: "Kombinert covertekst",
        weight: overlapsWeb ? 1.6 : 0.6,
        source: "ocr",
      });
    }
  });

  const deduped = new Map<string, QueryCandidate>();
  for (const candidate of candidates.sort((a, b) => b.weight - a.weight)) {
    const key = normalize(candidate.query);
    if (!deduped.has(key)) deduped.set(key, candidate);
  }

  return [...deduped.values()].slice(0, 5);
}

async function imageHash(buffer: Buffer, mode: "contain" | "cover") {
  const pipeline = sharp(buffer, { failOn: "none" }).rotate();
  const image = mode === "cover"
    ? pipeline.resize(24, 36, { fit: "cover", position: "centre" })
    : pipeline.resize(24, 36, { fit: "contain", background: "white" });

  const { data } = await image.grayscale().raw().toBuffer({ resolveWithObject: true });
  const average = data.reduce((sum, value) => sum + value, 0) / Math.max(data.length, 1);
  return Uint8Array.from(data as Uint8Array, (value: number) => (value >= average ? 1 : 0));
}

function hashSimilarity(left: Uint8Array, right: Uint8Array) {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;
  let equal = 0;
  for (let index = 0; index < length; index += 1) {
    if (left[index] === right[index]) equal += 1;
  }
  return equal / length;
}

async function posterSimilarity(sourceBuffer: Buffer, posterUrl: string | null) {
  if (!posterUrl) return 0;

  try {
    const response = await fetch(posterUrl, {
      signal: AbortSignal.timeout(8_000),
      cache: "force-cache",
    });
    if (!response.ok) return 0;

    const posterBuffer = Buffer.from(await response.arrayBuffer());
    const [sourceContain, sourceCover, posterContain, posterCover] = await Promise.all([
      imageHash(sourceBuffer, "contain"),
      imageHash(sourceBuffer, "cover"),
      imageHash(posterBuffer, "contain"),
      imageHash(posterBuffer, "cover"),
    ]);

    return Math.max(
      hashSimilarity(sourceContain, posterContain),
      hashSimilarity(sourceCover, posterCover),
      hashSimilarity(sourceContain, posterCover),
      hashSimilarity(sourceCover, posterContain),
    );
  } catch {
    return 0;
  }
}

function addRankedMovie(
  ranked: Map<number, RankedMovie>,
  movie: MovieSuggestion,
  rank: number,
  direct = false,
) {
  const existing = ranked.get(movie.tmdb_id);
  if (!existing) {
    ranked.set(movie.tmdb_id, { ...movie, rank, direct, evidenceCount: 1 });
    return;
  }

  ranked.set(movie.tmdb_id, {
    ...existing,
    ...movie,
    imdb_url: movie.imdb_url ?? existing.imdb_url,
    imdb_score: movie.imdb_score ?? existing.imdb_score,
    match_reason: existing.match_reason ?? movie.match_reason,
    rank: Math.max(existing.rank, rank) + 28,
    direct: existing.direct || direct,
    evidenceCount: existing.evidenceCount + 1,
  });
}

async function readImageFromRequest(formData: FormData) {
  const uploadedFile = formData.get("file");
  const releaseIdValue = formData.get("releaseId");
  const releaseId = typeof releaseIdValue === "string" ? releaseIdValue.trim() : "";

  if (uploadedFile instanceof File) {
    if (!ALLOWED_TYPES.has(uploadedFile.type)) {
      throw new Response("Coveret må være JPEG, PNG eller WebP", { status: 400 });
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      throw new Response("Coverbildet kan ikke være større enn 10 MB", { status: 400 });
    }
    return Buffer.from(await uploadedFile.arrayBuffer());
  }

  if (!releaseId) throw new Response("Velg et coverbilde først", { status: 400 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(releaseId)) {
    throw new Response("Ugyldig DVD-id", { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", releaseId)
    .single();

  if (releaseError || !release?.cover_path) {
    throw new Response("Fant ikke et lagret cover for denne DVD-en", { status: 404 });
  }

  const { data: storedCover, error: downloadError } = await supabase.storage
    .from("covers")
    .download(release.cover_path);

  if (downloadError || !storedCover) {
    console.error("Stored cover download failed", downloadError);
    throw new Response("Det lagrede coveret kunne ikke hentes", { status: 502 });
  }

  if (storedCover.size > MAX_FILE_SIZE) {
    throw new Response("Det lagrede coverbildet er større enn 10 MB", { status: 400 });
  }

  return Buffer.from(await storedCover.arrayBuffer());
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_VISION_API_KEY mangler på serveren" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ugyldig bildeforespørsel" }, { status: 400 });
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = await readImageFromRequest(formData);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    throw error;
  }

  // Normaliser fotoet før Vision. Dette reduserer støy fra svært store mobilbilder,
  // EXIF-rotasjon og transparente kanter, uten å overskrive originalcoveret.
  const normalizedBuffer = await sharp(imageBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: 1400, height: 2000, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "white" })
    .jpeg({ quality: 88 })
    .toBuffer();

  const visionResponse = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: normalizedBuffer.toString("base64") },
            features: [
              { type: "WEB_DETECTION", maxResults: 30 },
              { type: "TEXT_DETECTION", maxResults: 30 },
              { type: "LOGO_DETECTION", maxResults: 10 },
            ],
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    },
  );

  if (!visionResponse.ok) {
    const details = await visionResponse.text();
    console.error("Google Vision request failed", visionResponse.status, details);
    return NextResponse.json(
      { error: `Coveranalysen feilet (${visionResponse.status})` },
      { status: 502 },
    );
  }

  const payload = (await visionResponse.json()) as VisionResponse;
  const annotation = payload.responses?.[0];
  if (annotation?.error) {
    console.error("Google Vision annotation error", annotation.error);
    return NextResponse.json(
      { error: annotation.error.message || "Coveranalysen feilet" },
      { status: 502 },
    );
  }

  const web = annotation?.webDetection ?? {};
  const webQueries = extractWebQueries(web);
  const ocrQueries = extractOcrQueries(annotation?.textAnnotations?.[0]?.description, webQueries);
  const ranked = new Map<number, RankedMovie>();

  // Direkte identifikatorer fra sider med matchende bilder er sterkeste signal.
  const [imdbMatches, tmdbMatches] = await Promise.all([
    Promise.all(
      extractImdbEvidence(web).map(item =>
        findTmdbMovieByImdbId(item.id, item.score).catch(() => []),
      ),
    ),
    Promise.all(
      extractTmdbIds(web).map(id =>
        getTmdbMovieById(id, `Direkte treff via TMDB (${id})`).catch(() => null),
      ),
    ),
  ]);

  for (const movie of imdbMatches.flat()) addRankedMovie(ranked, movie, 2200, true);
  for (const movie of tmdbMatches) if (movie) addRankedMovie(ranked, movie, 2000, true);

  // Webbaserte kandidater søkes før OCR. OCR får bare lav vekt og kan ikke alene
  // dominere listen når Google har faktiske bildematcher.
  const queries = [...webQueries, ...ocrQueries]
    .filter((item, index, all) =>
      all.findIndex(other => normalize(other.query) === normalize(item.query)) === index,
    )
    .slice(0, 12);

  const queryMatches = await Promise.all(
    queries.map((candidate, queryIndex) =>
      searchTmdbMovies(candidate.query, {
        limit: candidate.source === "ocr" ? 3 : 5,
        matchReason: `${candidate.reason}: «${candidate.query}»`,
      })
        .then(results => ({ results, queryIndex, candidate }))
        .catch(() => ({ results: [], queryIndex, candidate })),
    ),
  );

  for (const group of queryMatches) {
    group.results.forEach((movie, resultIndex) => {
      const sourceBase = group.candidate.source === "page"
        ? 900
        : group.candidate.source === "visual"
          ? 760
          : 250;
      const rank =
        sourceBase -
        group.queryIndex * 24 -
        resultIndex * 12 +
        group.candidate.weight * 35 +
        titleSimilarity(group.candidate.query, movie);
      addRankedMovie(ranked, movie, rank);
    });
  }

  // Visuell rerangering mot TMDB-plakatene. Kandidater skapt av skuespillernavn
  // vil vanligvis få lav bildelikhet og falle ned eller filtreres bort.
  const initialCandidates = [...ranked.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 14);

  const similarities = await Promise.all(
    initialCandidates.map(async movie => ({
      tmdbId: movie.tmdb_id,
      similarity: await posterSimilarity(normalizedBuffer, movie.poster_url),
    })),
  );

  for (const item of similarities) {
    const movie = ranked.get(item.tmdbId);
    if (!movie) continue;
    const visualBonus = item.similarity >= 0.78
      ? 420
      : item.similarity >= 0.68
        ? 260
        : item.similarity >= 0.58
          ? 120
          : item.similarity >= 0.5
            ? 35
            : -80;
    ranked.set(item.tmdbId, { ...movie, rank: movie.rank + visualBonus });
  }

  const results = [...ranked.values()]
    .filter(movie => movie.direct || movie.rank >= MIN_RESULT_RANK || movie.evidenceCount >= 2)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map(({ rank: _rank, direct: _direct, evidenceCount: _evidenceCount, ...movie }) => movie);

  return NextResponse.json({
    results,
    detectedQueries: queries.map(item => item.query),
    confidence: results.length > 0 ? "matched" : "uncertain",
  });
}
