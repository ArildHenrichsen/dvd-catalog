import { getSupabaseAdmin } from "@/lib/supabase";

function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportDate() {
  return new Date().toISOString().slice(0, 10);
}

async function exportJson() {
  const { data, error } = await getSupabaseAdmin()
    .from("dvd_collection_json_feed")
    .select("original_title,alternative_title,release_year,imdb_score,imdb_url,main_genre")
    .order("original_title");

  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify(data ?? [], null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="dvd-katalog-${exportDate()}.json"`,
    },
  });
}

async function exportCsv() {
  const { data, error } = await getSupabaseAdmin()
    .from("releases")
    .select("*")
    .order("is_wishlist")
    .order("original_title");

  if (error) return new Response(error.message, { status: 500 });

  const headers = [
    "Status",
    "Originaltittel",
    "Alternativ tittel",
    "Utgivelsesår",
    "Region",
    "Utgave",
    "IMDb-score",
    "IMDb-link",
    "Merknad",
    "Coverreferanse",
    "Registrert",
    "Sist oppdatert",
  ];

  const rows = (data || []).map(release => [
    release.is_wishlist ? "Ønskeliste" : "I samlingen",
    release.original_title,
    release.alternative_title,
    release.release_year,
    release.region,
    release.edition,
    release.imdb_score,
    release.imdb_url,
    release.notes,
    release.cover_path,
    release.created_at,
    release.updated_at,
  ].map(cell).join(","));

  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="dvd-katalog-${exportDate()}.csv"`,
    },
  });
}

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "csv";

  if (format === "json") return exportJson();
  if (format === "csv") return exportCsv();

  return Response.json(
    { error: "Ugyldig eksportformat. Bruk csv eller json." },
    { status: 400 },
  );
}
