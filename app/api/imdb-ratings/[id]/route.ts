import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";
import {
  extractImdbId,
  getImdbRatings,
} from "@/lib/imdb-ratings";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext,
) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: release, error: readError } =
    await supabase
      .from("releases")
      .select("id, imdb_url")
      .eq("id", id)
      .single();

  if (readError || !release) {
    return NextResponse.json(
      {
        error:
          readError?.message ?? "DVD-en ble ikke funnet",
      },
      { status: 404 },
    );
  }

  const imdbId = extractImdbId(release.imdb_url);

  if (!imdbId) {
    return NextResponse.json(
      {
        error:
          "DVD-en mangler en gyldig IMDb-lenke",
      },
      { status: 400 },
    );
  }

  const ratings = await getImdbRatings([imdbId]);
  const result = ratings.get(imdbId);

  if (!result) {
    return NextResponse.json(
      {
        error:
          "IMDb har ingen rating for denne tittelen",
      },
      { status: 404 },
    );
  }

  const { error: updateError } = await supabase
    .from("releases")
    .update({
      imdb_score: result.rating,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    imdbScore: result.rating,
    votes: result.votes,
  });
}