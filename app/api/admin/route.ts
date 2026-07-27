import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";
import {
  extractImdbId,
  getImdbRatings,
} from "@/lib/imdb-ratings";

export const runtime = "nodejs";
export const maxDuration = 300;

type ReleaseRow = {
  id: string;
  imdb_url: string | null;
};

export async function POST() {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("releases")
    .select("id, imdb_url")
    .is("imdb_score", null)
    .not("imdb_url", "is", null);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  const releases = (data ?? []) as ReleaseRow[];

  const idsByImdbId = new Map<string, string[]>();

  let invalidLinks = 0;

  for (const release of releases) {
    const imdbId = extractImdbId(release.imdb_url);

    if (!imdbId) {
      invalidLinks += 1;
      continue;
    }

    const ids = idsByImdbId.get(imdbId) ?? [];
    ids.push(release.id);
    idsByImdbId.set(imdbId, ids);
  }

  const ratings = await getImdbRatings(
    idsByImdbId.keys(),
  );

  let updated = 0;
  let missingRating = 0;
  const failures: string[] = [];

  for (const [imdbId, releaseIds] of idsByImdbId) {
    const rating = ratings.get(imdbId);

    if (!rating) {
      missingRating += releaseIds.length;
      continue;
    }

    const { error: updateError } = await supabase
      .from("releases")
      .update({
        imdb_score: rating.rating,
      })
      .in("id", releaseIds);

    if (updateError) {
      failures.push(
        `${imdbId}: ${updateError.message}`,
      );
      continue;
    }

    updated += releaseIds.length;
  }

  return NextResponse.json({
    checked: releases.length,
    updated,
    invalidLinks,
    missingRating,
    failed: failures.length,
    failures: failures.slice(0, 10),
  });
}