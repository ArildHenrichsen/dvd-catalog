import { getSupabaseAdmin } from "@/lib/supabase";

function cell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET() {
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
      "content-disposition": `attachment; filename="dvd-katalog-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
