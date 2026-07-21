import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Release } from "@/lib/types";

function cleanTitle(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 240) : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const titles = [...new Set([
    cleanTitle(body?.original_title),
    cleanTitle(body?.alternative_title),
  ].filter(Boolean))];
  const year = typeof body?.release_year === "number" ? body.release_year : null;

  if (!titles.length) return NextResponse.json({ error: "Mangler filmtittel" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const rows = new Map<string, Release>();

  for (const title of titles) {
    for (const column of ["original_title", "alternative_title"] as const) {
      const { data, error } = await supabase
        .from("releases")
        .select("*")
        .ilike(column, title)
        .limit(20);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      for (const row of (data ?? []) as Release[]) rows.set(row.id, row);
    }
  }

  const ranked = [...rows.values()]
    .map(release => ({
      release,
      rank: release.release_year === year ? 0 : release.release_year == null || year == null ? 1 : 2,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  const matches = await Promise.all(ranked.map(async ({ release }) => ({
    id: release.id,
    original_title: release.original_title,
    alternative_title: release.alternative_title,
    release_year: release.release_year,
    is_wishlist: release.is_wishlist,
    cover_url: release.cover_path
      ? (await supabase.storage.from("covers").createSignedUrl(release.cover_path, 3600)).data?.signedUrl ?? null
      : null,
  })));

  return NextResponse.json({ matches });
}
