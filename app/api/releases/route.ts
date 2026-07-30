import { NextResponse } from "next/server";
import {
  enrichDvdMetadata,
  type MetadataManualField,
} from "@/lib/metadata-enrichment";
import { releaseSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

function normalizeImdbUrl(
  value: string | null | undefined,
): string | null {
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

export async function POST(req: Request) {
  if (!(await hasWriteAccess())) {
    return NextResponse.json(
      {
        error:
          "Skrivetilgang kreves. Aktiver token via /unlock.",
      },
      {
        status: 401,
      },
    );
  }

  const requestBody = await req
    .json()
    .catch(() => null);

  const parsed =
    releaseSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Ugyldige data",
      },
      {
        status: 400,
      },
    );
  }

  const supabase = getSupabaseAdmin();

  const allowDuplicate =
    req.headers.get("x-allow-duplicate") ===
    "true";

  if (!allowDuplicate) {
    const title =
      parsed.data.original_title.trim();

    const normalizedImdbUrl =
      normalizeImdbUrl(
        parsed.data.imdb_url,
      );

    // Encode user-provided values before building the raw .or() filter string
    // to avoid commas or other special characters breaking the comma-separated
    // condition list that PostgREST/Supabase expects.
    const encodedTitle = encodeURIComponent(title);

    const filters: string[] = [
      `original_title.ilike.${encodedTitle}`,
    ];

    if (normalizedImdbUrl) {
      const imdbId = normalizedImdbUrl.match(
        /tt\d{7,10}/i,
      )?.[0];

      if (imdbId) {
        filters.push(
          `imdb_url.ilike.%${imdbId}%`,
        );
      } else {
        const encodedImdb = encodeURIComponent(
          normalizedImdbUrl,
        );
        filters.push(
          `imdb_url.eq.${encodedImdb}`,
        );
      }
    }

    const {
      data: matches,
      error: matchError,
    } = await supabase
      .from("releases")
      .select(
        "id, original_title, alternative_title, release_year, is_wishlist, edition, region, imdb_url",
      )
      .or(filters.join(","))
      .limit(10);

    if (matchError) {
      return NextResponse.json(
        {
          error: matchError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (matches && matches.length > 0) {
      return NextResponse.json(
        {
          error: "Filmen finnes allerede",
          code: "POSSIBLE_DUPLICATE",
          matches,
        },
        {
          status: 409,
        },
      );
    }
  }

  const metadataManualFields = mergeManualFields([
    parsed.data.metadata_manual_fields,
  ]);

  let dataToInsert = {
    ...parsed.data,
    imdb_url: normalizeImdbUrl(
      parsed.data.imdb_url,
    ),
    genres: parsed.data.genres ?? [],
    manual_keywords:
      parsed.data.manual_keywords ?? [],
    metadata_manual_fields:
      metadataManualFields,
    is_wishlist:
      parsed.data.is_wishlist ?? false,
  };

  const shouldEnrich = Boolean(
    dataToInsert.metadata_provider_id ||
      dataToInsert.imdb_url,
  );

  if (shouldEnrich) {
    try {
      const enriched = await enrichDvdMetadata(
        dataToInsert,
        {
          provider:
            dataToInsert.metadata_provider,
          providerId:
            dataToInsert.metadata_provider_id,
          title:
            dataToInsert.original_title,
          releaseYear:
            dataToInsert.release_year,
          imdbUrl: dataToInsert.imdb_url,
        },
        {
          protectedFields:
            metadataManualFields as MetadataManualField[],
        },
      );

      dataToInsert = {
        ...dataToInsert,
        ...enriched.metadata,
        manual_keywords:
          dataToInsert.manual_keywords ?? [],
        genres:
          enriched.metadata.genres ??
          dataToInsert.genres ??
          [],
        metadata_manual_fields:
          metadataManualFields,
      };
    } catch (error) {
      console.error(
        "Create metadata enrichment failed:",
        error,
      );
    }
  }

  const { data, error } = await supabase
    .from("releases")
    .insert(dataToInsert)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(data, {
    status: 201,
  });
}
