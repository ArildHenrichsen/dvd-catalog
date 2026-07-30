import { NextResponse } from "next/server";
import {
  enrichDvdMetadata,
  type MetadataManualField,
  type ReleaseMetadataShape,
} from "@/lib/metadata-enrichment";
import { hasWriteAccess } from "@/lib/write-auth";

export const runtime = "nodejs";

type EnrichRequest = {
  current?: ReleaseMetadataShape;
  source?: {
    provider?: string | null;
    providerId?: string | null;
    tmdbId?: number | null;
    title?: string | null;
    releaseYear?: number | null;
    imdbUrl?: string | null;
  };
  options?: {
    force?: boolean;
  };
};

export async function POST(request: Request) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      { error: "Skrivetilgang kreves." },
      { status: 401 },
    );
  }

  const body =
    ((await request
      .json()
      .catch(() => null)) as EnrichRequest | null) ??
    null;

  if (!body?.current && !body?.source) {
    return NextResponse.json(
      { error: "Mangler metadata å berike." },
      { status: 400 },
    );
  }

  try {
    const current = body.current ?? {};
    const manualFields = (
      current.metadata_manual_fields ?? []
    ).filter(
      (
        field,
      ): field is MetadataManualField =>
        typeof field === "string",
    );

    const result = await enrichDvdMetadata(
      current,
      {
        provider:
          body.source?.provider ??
          current.metadata_provider,
        providerId:
          body.source?.providerId ??
          current.metadata_provider_id,
        tmdbId: body.source?.tmdbId ?? null,
        title:
          body.source?.title ??
          current.original_title,
        releaseYear:
          body.source?.releaseYear ??
          current.release_year,
        imdbUrl:
          body.source?.imdbUrl ??
          current.imdb_url,
      },
      {
        force: body.options?.force,
        protectedFields: manualFields,
      },
    );

    return NextResponse.json({
      metadata: result.metadata,
      changedFields: result.changedFields,
      provider: result.provider,
      providerId: result.providerId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Metadata kunne ikke hentes",
      },
      { status: 502 },
    );
  }
}
