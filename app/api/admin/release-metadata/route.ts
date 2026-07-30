import { NextResponse } from "next/server";
import {
  enrichDvdMetadata,
  getMissingMetadataFields,
  type MetadataManualField,
} from "@/lib/metadata-enrichment";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

type ReleaseRow = {
  id: string;
  original_title: string;
  alternative_title: string | null;
  release_year: number | null;
  imdb_url: string | null;
  overview: string | null;
  runtime_minutes: number | null;
  genres: string[] | null;
  auto_keywords: string[] | null;
  metadata_provider: string | null;
  metadata_provider_id: string | null;
  metadata_last_enriched_at: string | null;
  metadata_manual_fields: string[] | null;
  keywords_source: string | null;
  keywords_updated_at: string | null;
  is_wishlist: boolean;
  updated_at?: string;
};

type BulkRequest = {
  dryRun?: boolean;
  onlyMissing?: boolean;
  batchSize?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function needsMetadata(
  release: ReleaseRow,
) {
  const missingFields =
    getMissingMetadataFields(release);

  return (
    missingFields.includes("imdb_url") ||
    missingFields.includes("overview") ||
    missingFields.includes("runtime_minutes") ||
    missingFields.includes("genres") ||
    !release.auto_keywords?.length
  );
}

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
      .catch(() => null)) as BulkRequest | null) ??
    {};

  const dryRun = body.dryRun === true;
  const onlyMissing = body.onlyMissing !== false;
  const batchSize = Math.min(
    100,
    Math.max(1, Number(body.batchSize) || 20),
  );

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("releases")
      .select(
        "id,original_title,alternative_title,release_year,imdb_url,overview,runtime_minutes,genres,auto_keywords,metadata_provider,metadata_provider_id,metadata_last_enriched_at,metadata_manual_fields,keywords_source,keywords_updated_at,is_wishlist,updated_at",
      )
      .eq("is_wishlist", false)
      .order("updated_at", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const releases = (data ?? []) as ReleaseRow[];
    const queue = releases
      .filter((release) =>
        onlyMissing ? needsMetadata(release) : true,
      )
      .filter(
        (release) =>
          Boolean(
            release.metadata_provider_id ||
              release.imdb_url ||
              release.original_title,
          ),
      )
      .slice(0, batchSize);
    const candidateCount = queue.length;

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failures: string[] = [];

    const workers = Array.from({
      length: Math.min(3, queue.length),
    }).map(async (_, workerIndex) => {
      while (queue.length > 0) {
        const release = queue.shift();

        if (!release) {
          return;
        }

        processed += 1;

        try {
          const enriched = await enrichDvdMetadata(
            release,
            {
              provider:
                release.metadata_provider,
              providerId:
                release.metadata_provider_id,
              title: release.original_title,
              releaseYear:
                release.release_year,
              imdbUrl: release.imdb_url,
            },
            {
              force: !onlyMissing,
              protectedFields:
                (release.metadata_manual_fields ??
                  []) as MetadataManualField[],
            },
          );

          if (enriched.changedFields.length === 0) {
            skipped += 1;
            await sleep(150);
            continue;
          }

          if (dryRun) {
            updated += 1;
            await sleep(150);
            continue;
          }

          const { error: updateError } =
            await supabase
              .from("releases")
              .update({
                ...enriched.metadata,
                genres:
                  enriched.metadata.genres ?? [],
                metadata_manual_fields:
                  release.metadata_manual_fields ??
                  [],
              })
              .eq("id", release.id);

          if (updateError) {
            throw updateError;
          }

          updated += 1;
        } catch (error) {
          failed += 1;
          failures.push(
            `${release.id}: ${
              error instanceof Error
                ? error.message
                : "Ukjent feil"
            }`,
          );
        }

        await sleep(150 + workerIndex * 50);
      }
    });

    await Promise.all(workers);

    return NextResponse.json({
      dryRun,
      onlyMissing,
      batchSize,
      candidates: candidateCount,
      processed,
      updated,
      skipped,
      failed,
      failures: failures.slice(0, 25),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Metadata-jobben feilet",
      },
      { status: 500 },
    );
  }
}
