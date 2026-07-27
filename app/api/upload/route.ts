import { NextResponse } from "next/server";
import sharp from "sharp";
import { hasWriteAccess } from "@/lib/write-auth";
import { uploadCoverAssets } from "@/lib/covers";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "application/octet-stream",
  "",
]);

const allowedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.at(-1) ?? "";
}

function isSupportedImage(file: File): boolean {
  const extension = getExtension(file.name);

  return (
    allowedMimeTypes.has(file.type.toLowerCase()) &&
    (allowedExtensions.has(extension) ||
      file.type.startsWith("image/"))
  );
}

export async function POST(req: Request) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      {
        error: "Skrivetilgang kreves.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Ingen bildefil ble mottatt.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isSupportedImage(file)) {
      return NextResponse.json(
        {
          error:
            "Filformatet støttes ikke. Bruk JPEG, PNG, WebP, HEIC eller HEIF.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error: "Bildefilen er tom.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Bildet er større enn 25 MB. Velg et mindre bilde eller reduser bildekvaliteten.",
        },
        {
          status: 400,
        },
      );
    }

    const sourceBuffer = Buffer.from(
      await file.arrayBuffer(),
    );

    let normalizedBuffer: Buffer;

    try {
      normalizedBuffer = await sharp(sourceBuffer, {
        failOn: "none",
        limitInputPixels: 80_000_000,
      })
        .rotate()
        .resize({
          width: 2200,
          height: 3200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 88,
          mozjpeg: true,
        })
        .toBuffer();
    } catch (conversionError) {
      console.error(
        "Cover image conversion failed:",
        conversionError,
      );

      const message =
        file.type.includes("heic") ||
        file.type.includes("heif") ||
        ["heic", "heif"].includes(
          getExtension(file.name),
        )
          ? "HEIC-bildet kunne ikke konverteres. Prøv å velge bildet fra bildebiblioteket som JPEG, eller endre kameraformatet til Mest kompatibel."
          : "Bildet kunne ikke leses eller konverteres. Prøv et annet bilde.";

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 400,
        },
      );
    }

    const assets = await uploadCoverAssets(
      normalizedBuffer,
      "image/jpeg",
    );

    return NextResponse.json({
      path: assets.coverPath,
      thumbnailPath: assets.thumbnailPath,
      url: assets.coverUrl,
      thumbnailUrl: assets.thumbnailUrl,
    });
  } catch (error) {
    console.error("Cover upload failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Opplasting av cover feilet: ${error.message}`
            : "Opplasting av cover feilet på grunn av en ukjent feil.",
      },
      {
        status: 500,
      },
    );
  }
}