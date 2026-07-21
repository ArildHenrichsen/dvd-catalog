import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  findTmdbMovieByImdbId,
  searchTmdbMovies,
  type MovieSuggestion,
} from "@/lib/tmdb";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const GENERIC_LABELS = new Set([
  "dvd",
  "dvd cover",
  "film",
  "movie",
  "poster",
  "cinema",
  "compact disc",
  "product",
]);

type VisionWebDetection = {
  bestGuessLabels?: Array<{ label?: string }>;
  webEntities?: Array<{ entityId?: string; score?: number; description?: string }>;
  pagesWithMatchingImages?: Array<{ url?: string; pageTitle?: string }>;
};

type VisionResponse = {
  responses?: Array<{
    webDetection?: VisionWebDetection;
    error?: { code?: number; message?: string };
  }>;
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

function extractImdbEvidence(web: VisionWebDetection) {
  const evidence = new Map<string, number | null>();
  for (const page of web.pagesWithMatchingImages ?? []) {
    const text = `${page.url ?? ""} ${page.pageTitle ?? ""}`;
    const ids = text.match(/tt\d{7,10}/g) ?? [];
    const scoreMatch = /IMDb[^0-9]{0,30}(10(?:\.0)?|[0-9](?:\.[0-9])?)(?:\s*\/\s*10)?/i.exec(text)
      ?? /(10(?:\.0)?|[0-9](?:\.[0-9])?)\s*\/\s*10[^A-Za-z]{0,20}IMDb/i.exec(text);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;
    for (const id of ids) if (!evidence.has(id) || score !== null) evidence.set(id, score);
  }
  return [...evidence.entries()].slice(0, 3).map(([id, score]) => ({ id, score }));
}

function extractQueries(web: VisionWebDetection) {
  const candidates: Array<{ query: string; reason: string; score: number }> = [];

  for (const label of web.bestGuessLabels ?? []) {
    if (label.label) {
      const query = cleanCandidate(label.label);
      if (query.length >= 2) candidates.push({ query, reason: "Visuelt hovedtreff", score: 2 });
    }
  }

  for (const entity of web.webEntities ?? []) {
    if (!entity.description) continue;
    const query = cleanCandidate(entity.description);
    if (
      query.length >= 2 &&
      !GENERIC_LABELS.has(query.toLocaleLowerCase("en"))
    ) {
      candidates.push({
        query,
        reason: "Visuelt lignende bilde",
        score: entity.score ?? 0,
      });
    }
  }

  for (const page of web.pagesWithMatchingImages ?? []) {
    if (!page.pageTitle) continue;
    const query = cleanCandidate(page.pageTitle);
    if (query.length >= 3) {
      candidates.push({ query, reason: "Matchende nettside", score: 0.35 });
    }
  }

  const deduped = new Map<string, { query: string; reason: string; score: number }>();
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    const key = candidate.query.toLocaleLowerCase("nb-NO");
    if (!deduped.has(key)) deduped.set(key, candidate);
  }

  return [...deduped.values()].slice(0, 6);
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

  const uploadedFile = formData.get("file");
  const releaseIdValue = formData.get("releaseId");
  const releaseId = typeof releaseIdValue === "string" ? releaseIdValue.trim() : "";

  let imageBuffer: Buffer;

  if (uploadedFile instanceof File) {
    if (!ALLOWED_TYPES.has(uploadedFile.type)) {
      return NextResponse.json(
        { error: "Coveret må være JPEG, PNG eller WebP" },
        { status: 400 },
      );
    }
    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Coverbildet kan ikke være større enn 10 MB" },
        { status: 400 },
      );
    }

    imageBuffer = Buffer.from(await uploadedFile.arrayBuffer());
  } else if (releaseId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(releaseId)) {
      return NextResponse.json({ error: "Ugyldig DVD-id" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: release, error: releaseError } = await supabase
      .from("releases")
      .select("cover_path")
      .eq("id", releaseId)
      .single();

    if (releaseError || !release?.cover_path) {
      return NextResponse.json(
        { error: "Fant ikke et lagret cover for denne DVD-en" },
        { status: 404 },
      );
    }

    const { data: storedCover, error: downloadError } = await supabase.storage
      .from("covers")
      .download(release.cover_path);

    if (downloadError || !storedCover) {
      console.error("Stored cover download failed", downloadError);
      return NextResponse.json(
        { error: "Det lagrede coveret kunne ikke hentes" },
        { status: 502 },
      );
    }

    if (storedCover.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Det lagrede coverbildet er større enn 10 MB" },
        { status: 400 },
      );
    }

    imageBuffer = Buffer.from(await storedCover.arrayBuffer());
  } else {
    return NextResponse.json({ error: "Velg et coverbilde først" }, { status: 400 });
  }

  const content = imageBuffer.toString("base64");
  const visionResponse = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content },
            features: [{ type: "WEB_DETECTION", maxResults: 20 }],
          },
        ],
      }),
      cache: "no-store",
    },
  );

  if (!visionResponse.ok) {
    const details = await visionResponse.text();
    console.error("Google Vision request failed", visionResponse.status, details);
    return NextResponse.json(
      { error: "Den visuelle covertjenesten kunne ikke nås" },
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

  const web = annotation?.webDetection;
  if (!web) {
    return NextResponse.json({ results: [], detectedQueries: [] });
  }

  const imdbEvidence = extractImdbEvidence(web);
  const queries = extractQueries(web);
  const ranked = new Map<number, MovieSuggestion & { rank: number }>();

  const imdbMatches = await Promise.all(
    imdbEvidence.map(item => findTmdbMovieByImdbId(item.id, item.score).catch(() => [])),
  );
  for (const movie of imdbMatches.flat()) {
    ranked.set(movie.tmdb_id, { ...movie, rank: 1000 });
  }

  const queryMatches = await Promise.all(
    queries.map((candidate, queryIndex) =>
      searchTmdbMovies(candidate.query, {
        limit: 4,
        matchReason: `${candidate.reason}: «${candidate.query}»`,
      })
        .then(results => ({ results, queryIndex, candidate }))
        .catch(() => ({ results: [], queryIndex, candidate })),
    ),
  );

  for (const group of queryMatches) {
    group.results.forEach((movie, resultIndex) => {
      const rank = 500 - group.queryIndex * 40 - resultIndex * 8 + group.candidate.score * 10;
      const existing = ranked.get(movie.tmdb_id);
      if (!existing || rank > existing.rank) ranked.set(movie.tmdb_id, { ...movie, rank });
    });
  }

  const results = [...ranked.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map(({ rank: _rank, ...movie }) => movie);

  return NextResponse.json({
    results,
    detectedQueries: queries.map(item => item.query),
  });
}
