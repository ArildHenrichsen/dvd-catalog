import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

const ALLOWED_HOSTS = new Set(["image.tmdb.org"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  const posterUrlValue =
    typeof body === "object" && body !== null && "posterUrl" in body
      ? (body as { posterUrl?: unknown }).posterUrl
      : null;

  if (typeof posterUrlValue !== "string") {
    return NextResponse.json({ error: "Mangler plakatadresse" }, { status: 400 });
  }

  let posterUrl: URL;
  try {
    posterUrl = new URL(posterUrlValue);
  } catch {
    return NextResponse.json({ error: "Ugyldig plakatadresse" }, { status: 400 });
  }

  if (posterUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(posterUrl.hostname)) {
    return NextResponse.json(
      { error: "Bare bilder fra TMDB kan importeres" },
      { status: 400 },
    );
  }

  const imageResponse = await fetch(posterUrl, {
    headers: { accept: "image/jpeg,image/png,image/webp" },
    cache: "no-store",
  });

  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: "TMDB-coveret kunne ikke hentes" },
      { status: 502 },
    );
  }

  const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    return NextResponse.json(
      { error: "TMDB returnerte ikke et støttet bildeformat" },
      { status: 502 },
    );
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  if (imageBuffer.byteLength > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "TMDB-coveret er større enn 10 MB" },
      { status: 400 },
    );
  }

  const extension =
    contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().getFullYear()}/${randomUUID()}.${extension}`;
  const supabase = getSupabaseAdmin();

  const { error: uploadError } = await supabase.storage
    .from("covers")
    .upload(path, imageBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from("covers")
    .createSignedUrl(path, 3600);

  if (signedError || !signedData?.signedUrl) {
    await supabase.storage.from("covers").remove([path]);
    return NextResponse.json(
      { error: "Coveret ble lastet opp, men forhåndsvisning kunne ikke opprettes" },
      { status: 500 },
    );
  }

  return NextResponse.json({ path, url: signedData.signedUrl });
}
