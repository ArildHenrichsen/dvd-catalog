import { NextRequest, NextResponse } from "next/server";
import { listReleases } from "@/lib/releases";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  try {
    const result = await listReleases({
      q: p.get("q") || undefined,
      year: p.get("year") || undefined,
      region: p.get("region") || undefined,
      edition: p.get("edition") || undefined,
      scoreMin: p.get("scoreMin") || undefined,
      scoreMax: p.get("scoreMax") || undefined,
      cover: p.get("cover") === "yes" || p.get("cover") === "no" ? p.get("cover") as "yes" | "no" : "",
      sort: p.get("sort") || undefined,
      dir: p.get("dir") === "asc" ? "asc" : "desc",
      offset: Number(p.get("offset") || 0),
      limit: Number(p.get("limit") || 20),
      wishlist: p.get("wishlist") === "true",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Kunne ikke hente filmer" }, { status: 500 });
  }
}
