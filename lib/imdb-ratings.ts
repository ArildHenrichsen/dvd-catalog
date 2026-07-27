import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const RATINGS_URL =
  "https://datasets.imdbws.com/title.ratings.tsv.gz";

export type ImdbRating = {
  imdbId: string;
  rating: number;
  votes: number;
};

export function extractImdbId(
  imdbUrl: string | null | undefined,
): string | null {
  if (!imdbUrl) return null;

  const match = imdbUrl.match(/\/title\/(tt\d{7,10})/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function getImdbRatings(
  requestedIds: Iterable<string>,
): Promise<Map<string, ImdbRating>> {
  const remaining = new Set(
    Array.from(requestedIds, (id) => id.toLowerCase()),
  );

  const results = new Map<string, ImdbRating>();

  if (remaining.size === 0) {
    return results;
  }

  const response = await fetch(RATINGS_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `IMDb-datasettet svarte med ${response.status}`,
    );
  }

  const compressedStream = Readable.fromWeb(
    response.body as never,
  );

  const lines = createInterface({
    input: compressedStream.pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (line.startsWith("tconst")) continue;

    const [imdbId, ratingText, votesText] =
      line.split("\t");

    if (!remaining.has(imdbId)) continue;

    const rating = Number(ratingText);
    const votes = Number(votesText);

    if (
      Number.isFinite(rating) &&
      Number.isFinite(votes)
    ) {
      results.set(imdbId, {
        imdbId,
        rating,
        votes,
      });
    }

    remaining.delete(imdbId);

    if (remaining.size === 0) {
      lines.close();
      compressedStream.destroy();
      break;
    }
  }

  return results;
}