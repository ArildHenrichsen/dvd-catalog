import { NextResponse } from "next/server";
import {
  extractImdbId,
  getImdbRatings,
} from "@/lib/imdb-ratings";

export const runtime = "nodejs";
export const maxDuration = 120;

type RequestBody = {
  imdbUrl?: string | null;
  imdbId?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const directId =
      typeof body.imdbId === "string"
        ? body.imdbId.trim().toLowerCase()
        : "";

    const imdbId =
      /^tt\d{7,10}$/.test(directId)
        ? directId
        : extractImdbId(body.imdbUrl);

    if (!imdbId) {
      return NextResponse.json(
        {
          error: "Ingen gyldig IMDb-ID eller IMDb-lenke.",
        },
        {
          status: 400,
        },
      );
    }

    const ratings = await getImdbRatings([imdbId]);
    const rating = ratings.get(imdbId);

    if (!rating) {
      return NextResponse.json(
        {
          error: "IMDb har ingen rating for denne tittelen.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      imdbId: rating.imdbId,
      imdbScore: rating.rating,
      votes: rating.votes,
    });
  } catch (error) {
    console.error("IMDb rating lookup failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "IMDb-score kunne ikke hentes.",
      },
      {
        status: 500,
      },
    );
  }
}