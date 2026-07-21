import { NextResponse } from "next/server";
import { hasWriteAccess } from "@/lib/write-auth";
import { uploadCoverAssets } from "@/lib/covers";

const ALLOWED_HOSTS = new Set(["image.tmdb.org"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await hasWriteAccess())) return NextResponse.json({ error: "Skrivetilgang kreves" }, { status: 401 });
  const body = await request.json().catch(() => null) as { posterUrl?: unknown } | null;
  if (typeof body?.posterUrl !== "string") return NextResponse.json({ error: "Mangler plakatadresse" }, { status: 400 });

  let posterUrl: URL;
  try { posterUrl = new URL(body.posterUrl); } catch { return NextResponse.json({ error: "Ugyldig plakatadresse" }, { status: 400 }); }
  if (posterUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(posterUrl.hostname)) {
    return NextResponse.json({ error: "Bare bilder fra TMDB kan importeres" }, { status: 400 });
  }

  const imageResponse = await fetch(posterUrl, { headers: { accept: "image/jpeg,image/png,image/webp" }, cache: "no-store" });
  if (!imageResponse.ok) return NextResponse.json({ error: "TMDB-coveret kunne ikke hentes" }, { status: 502 });
  const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return NextResponse.json({ error: "TMDB returnerte ikke et støttet bildeformat" }, { status: 502 });
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  if (imageBuffer.byteLength > MAX_FILE_SIZE) return NextResponse.json({ error: "TMDB-coveret er større enn 10 MB" }, { status: 400 });

  try {
    const assets = await uploadCoverAssets(imageBuffer, contentType);
    return NextResponse.json({ path: assets.coverPath, thumbnailPath: assets.thumbnailPath, url: assets.coverUrl, thumbnailUrl: assets.thumbnailUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Coverimport feilet" }, { status: 500 });
  }
}
