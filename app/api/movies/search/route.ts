import { NextResponse } from "next/server";
import { searchTmdbMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Søket må inneholde minst to tegn" },
      { status: 400 },
    );
  }

  try {
    const results = await searchTmdbMovies(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Filmsøket feilet" },
      { status: 502 },
    );
  }
}
