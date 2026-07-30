import { NextResponse } from "next/server";
import {
  enrichDvdMetadata,
  type MetadataManualField,
} from "@/lib/metadata-enrichment";
import { getSupabaseAdmin } from "@/lib/supabase";
import { releaseSchema } from "@/lib/validation";
import { hasWriteAccess } from "@/lib/write-auth";
import { removeCoverAssets } from "@/lib/covers";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeImdbUrl(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /\/title\/(tt\d{7,10})/i,
  );

  if (!match) {
    return trimmed;
  }

  return `https://www.imdb.com/title/${match[1].toLowerCase()}/`;
}

function mergeManualFields(
  values: Array<string[] | null | undefined>,
) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of values) {
    for (const field of list ?? []) {
      if (!field || seen.has(field)) {
        continue;
      }

      seen.add(field);
      merged.push(field);
    }
  }

  return merged;
}

async function pathIsReferenced(path: string, excludedId?: string) {
  let query = getSupabaseAdmin().from("releases").select("id", { count: "exact", head: true })
    .or(`cover_path.eq.${path},thumbnail_path.eq.${path}`);
  if (excludedId) query = query.neq("id", excludedId);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await hasWriteAccess())) return NextResponse.json({ error: "Skrivetilgang kreves" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = releaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("releases")
    .select("original_title,alternative_title,release_year,imdb_url,overview,runtime_minutes,genres,auto_keywords,keywords_source,keywords_updated_at,metadata_provider,metadata_provider_id,metadata_last_enriched_at,metadata_manual_fields,cover_path,thumbnail_path")
    .eq("id", id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const metadataManualFields = mergeManualFields([
    existing?.metadata_manual_fields,
    parsed.data.metadata_manual_fields,
  ]);

  let dataToUpdate: Record<string, unknown> = {
    ...parsed.data,
    imdb_url: normalizeImdbUrl(
      parsed.data.imdb_url,
    ),
    genres: parsed.data.genres ?? [],
    manual_keywords:
      parsed.data.manual_keywords ?? [],
    metadata_manual_fields:
      metadataManualFields,
  };

  const shouldEnrich = Boolean(
    dataToUpdate.metadata_provider_id ||
      existing?.metadata_provider_id ||
      dataToUpdate.imdb_url ||
      existing?.imdb_url,
  );

  if (shouldEnrich) {
    try {
      const enriched = await enrichDvdMetadata(
        {
          ...existing,
          ...dataToUpdate,
        },
        {
          provider:
            (dataToUpdate.metadata_provider as
              string | null | undefined) ??
            existing?.metadata_provider,
          providerId:
            (dataToUpdate.metadata_provider_id as
              string | null | undefined) ??
            existing?.metadata_provider_id,
          title:
            (dataToUpdate.original_title as
              string | null | undefined) ??
            existing?.original_title,
          releaseYear:
            (dataToUpdate.release_year as
              number | null | undefined) ??
            existing?.release_year,
          imdbUrl:
            (dataToUpdate.imdb_url as
              string | null | undefined) ??
            existing?.imdb_url,
        },
        {
          protectedFields:
            metadataManualFields as MetadataManualField[],
        },
      );

      dataToUpdate = {
        ...dataToUpdate,
        ...enriched.metadata,
        manual_keywords:
          dataToUpdate.manual_keywords ?? [],
        genres:
          enriched.metadata.genres ??
          dataToUpdate.genres ??
          [],
        metadata_manual_fields:
          metadataManualFields,
      };
    } catch (error) {
      console.error(
        "Update metadata enrichment failed:",
        error,
      );
    }
  }

  const { error: updateError } = await supabase.from("releases").update(dataToUpdate).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const oldPaths = [existing?.cover_path, existing?.thumbnail_path].filter((p): p is string => Boolean(p));
  const newPaths = new Set([parsed.data.cover_path, parsed.data.thumbnail_path].filter(Boolean));
  const removable: string[] = [];
  let coverWarning: string | null = null;
  try {
    for (const path of oldPaths) {
      if (!newPaths.has(path) && !(await pathIsReferenced(path, id))) removable.push(path);
    }
    coverWarning = await removeCoverAssets(removable);
  } catch (error) {
    coverWarning = error instanceof Error ? error.message : "Kunne ikke rydde gamle coverfiler";
  }

  return NextResponse.json({ id, coverWarning });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await hasWriteAccess())) return NextResponse.json({ error: "Skrivetilgang kreves" }, { status: 401 });
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: release, error: readError } = await supabase.from("releases").select("cover_path,thumbnail_path").eq("id", id).single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const { error: deleteError } = await supabase.from("releases").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const candidates = [release?.cover_path, release?.thumbnail_path].filter((p): p is string => Boolean(p));
  const removable: string[] = [];
  let coverWarning: string | null = null;
  try {
    for (const path of candidates) if (!(await pathIsReferenced(path))) removable.push(path);
    coverWarning = await removeCoverAssets(removable);
  } catch (error) {
    coverWarning = error instanceof Error ? error.message : "Kunne ikke rydde coverfiler";
  }
  return NextResponse.json({ ok: true, coverWarning });
}
