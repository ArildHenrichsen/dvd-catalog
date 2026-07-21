import { NextResponse } from "next/server";
import { hasWriteAccess } from "@/lib/write-auth";
import { uploadCoverAssets } from "@/lib/covers";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json({ error: "Skrivetilgang kreves" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Ingen fil" }, { status: 400 });
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Kun JPEG, PNG og WebP" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Maks filstørrelse er 10 MB" }, { status: 400 });

  try {
    const assets = await uploadCoverAssets(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({
      path: assets.coverPath,
      thumbnailPath: assets.thumbnailPath,
      url: assets.coverUrl,
      thumbnailUrl: assets.thumbnailUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Opplasting feilet" }, { status: 500 });
  }
}
