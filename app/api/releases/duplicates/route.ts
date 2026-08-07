import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

function normalizeImdbUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/\/title\/(tt\d{7,10})/i);

  return match
    ? `https://www.imdb.com/title/${match[1].toLowerCase()}/`
    : value.trim() || null;
}

export async function GET(req: Request) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const normalizedImdbUrl = normalizeImdbUrl(
    searchParams.get("imdbUrl"),
  );

  if (!title) {
    return NextResponse.json(
      { error: "Originaltittel mangler." },
      { status: 400 },
    );
  }

  const filters = [
    `original_title.ilike.${encodeURIComponent(title)}`,
  ];

  const imdbId = normalizedImdbUrl?.match(/tt\d{7,10}/i)?.[0];

  if (imdbId) {
    filters.push(`imdb_url.ilike.%${imdbId}%`);
  } else if (normalizedImdbUrl) {
    filters.push(
      `imdb_url.eq.${encodeURIComponent(normalizedImdbUrl)}`,
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("releases")
    .select(
      "id, original_title, alternative_title, release_year, is_wishlist, edition, region, imdb_url",
    )
    .or(filters.join(","))
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ matches: data ?? [] });
}
