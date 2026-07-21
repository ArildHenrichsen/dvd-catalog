import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
};

export async function GET(request: Request) {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TMDB_READ_ACCESS_TOKEN mangler på serveren" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Søket må inneholde minst to tegn" }, { status: 400 });
  }

  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "nb-NO");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("TMDB search failed", response.status, details);
    return NextResponse.json({ error: "Filmdatabasen kunne ikke nås" }, { status: 502 });
  }

  const payload = (await response.json()) as { results?: TmdbMovie[] };
  const results = (payload.results ?? []).slice(0, 8).map(movie => ({
    tmdb_id: movie.id,
    original_title: movie.original_title,
    alternative_title:
      movie.title && movie.title !== movie.original_title ? movie.title : null,
    release_year: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
    poster_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
      : null,
    overview: movie.overview || null,
  }));

  return NextResponse.json({ results });
}
