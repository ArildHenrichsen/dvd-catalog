import { NextResponse } from "next/server";
import { releaseSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

type DuplicateMatch = {
  id: string;
  original_title: string;
  alternative_title: string | null;
  release_year: number | null;
  is_wishlist: boolean;
  edition: string | null;
  region: string | null;
  imdb_url: string | null;
};

function normalizeImdbUrl(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(
    /\/title\/(tt\d{7,10})/i,
  );

  if (!match) {
    return value.trim();
  }

  return `https://www.imdb.com/title/${match[1].toLowerCase()}/`;
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

    const filters: string[] = [
      `original_title.ilike.${title}`,
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
        filters.push(
          `imdb_url.eq.${normalizedImdbUrl}`,
        );
      }
    }

    const { data: matches, error: matchError } =
      await supabase
        .from("releases")
        .select(
          [
            "id",
            "original_title",
            "alternative_title",
            "release_year",
            "is_wishlist",
            "edition",
            "region",
            "imdb_url",
          ].join(","),
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

    if (matches?.length) {
      return NextResponse.json(
        {
          error:
            "Filmen finnes allerede",
          code: "POSSIBLE_DUPLICATE",
          matches:
            matches as DuplicateMatch[],
        },
        {
          status: 409,
        },
      );
    }
  }

  const dataToInsert = {
    ...parsed.data,
    imdb_url:
      normalizeImdbUrl(
        parsed.data.imdb_url,
      ),
    is_wishlist:
      parsed.data.is_wishlist ?? false,
  };

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