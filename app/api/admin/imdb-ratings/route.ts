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

type FailureItem = {
  imdbId: string;
  message: string;
};

export async function POST() {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      {
        error: "Skrivetilgang kreves.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error: readError } = await supabase
      .from("releases")
      .select("id, imdb_url")
      .is("imdb_score", null);

    if (readError) {
      return NextResponse.json(
        {
          error: `Kunne ikke hente DVD-er: ${readError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const releases = (data ?? []) as ReleaseRow[];

    if (releases.length === 0) {
      return NextResponse.json({
        checked: 0,
        updated: 0,
        invalidLinks: 0,
        missingRating: 0,
        failed: 0,
        failures: [],
      });
    }

    const releaseIdsByImdbId = new Map<string, string[]>();

    let invalidLinks = 0;

    for (const release of releases) {
      const imdbId = extractImdbId(release.imdb_url);

      if (!imdbId) {
        invalidLinks += 1;
        continue;
      }

      const existingReleaseIds =
        releaseIdsByImdbId.get(imdbId) ?? [];

      existingReleaseIds.push(release.id);
      releaseIdsByImdbId.set(
        imdbId,
        existingReleaseIds,
      );
    }

    if (releaseIdsByImdbId.size === 0) {
      return NextResponse.json({
        checked: releases.length,
        updated: 0,
        invalidLinks,
        missingRating: 0,
        failed: 0,
        failures: [],
      });
    }

    const ratings = await getImdbRatings(
      releaseIdsByImdbId.keys(),
    );

    let updated = 0;
    let missingRating = 0;

    const failures: FailureItem[] = [];

    for (const [
      imdbId,
      releaseIds,
    ] of releaseIdsByImdbId.entries()) {
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
        .in("id", releaseIds)
        .is("imdb_score", null);

      if (updateError) {
        failures.push({
          imdbId,
          message: updateError.message,
        });

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
      failures: failures
        .slice(0, 20)
        .map(
          (failure) =>
            `${failure.imdbId}: ${failure.message}`,
        ),
    });
  } catch (error) {
    console.error(
      "IMDb ratings admin update failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "En ukjent feil oppstod under oppdatering av IMDb-scorer.",
      },
      {
        status: 500,
      },
    );
  }
}