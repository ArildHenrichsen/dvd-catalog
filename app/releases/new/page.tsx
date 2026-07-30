import { ReleaseForm } from "@/components/release-form";
import { getRelease } from "@/lib/releases";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Release } from "@/lib/types";

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{
    duplicate?: string;
    wishlist?: string;
    coverPath?: string;
    thumbnailPath?: string;
    originalTitle?: string;
    alternativeTitle?: string;
    releaseYear?: string;
    imdbUrl?: string;
    imdbScore?: string;
  }>;
}) {
  const params = await searchParams;
  const source = params.duplicate ? await getRelease(params.duplicate) : undefined;

  let scannedInitial: Release | undefined;
  if (!source && params.coverPath) {
    const signed = await getSupabaseAdmin().storage.from("covers").createSignedUrl(params.coverPath, 3600);
    scannedInitial = {
      id: "",
      original_title: params.originalTitle || "",
      alternative_title: params.alternativeTitle || null,
      release_year: params.releaseYear ? Number(params.releaseYear) : null,
      region: "2",
      edition: "Nordisk",
      imdb_score: params.imdbScore ? Number(params.imdbScore) : null,
      imdb_url: params.imdbUrl || null,
      notes: null,
      cover_path: params.coverPath,
      thumbnail_path: params.thumbnailPath || null,
      cover_url: signed.data?.signedUrl ?? null,
      auto_keywords: [],
      manual_keywords: [],
      keywords_source: null,
      keywords_updated_at: null,
      times_suggested: 0,
      last_suggested_at: null,
      theme_suggestion_counts: {},
      is_wishlist: false,
      created_at: "",
      updated_at: "",
    };
  }

  const clone = source
    ? { ...source, id: "", created_at: "", updated_at: "" }
    : scannedInitial
      ? scannedInitial
      : params.wishlist === "true"
        ? {
            id: "",
            original_title: "",
            alternative_title: null,
            release_year: null,
            region: "2",
            edition: "Nordisk",
            imdb_score: null,
            imdb_url: null,
            notes: null,
            cover_path: null,
            thumbnail_path: null,
            auto_keywords: [],
            manual_keywords: [],
            keywords_source: null,
            keywords_updated_at: null,
            times_suggested: 0,
            last_suggested_at: null,
            theme_suggestion_counts: {},
            is_wishlist: true,
            created_at: "",
            updated_at: "",
          }
        : undefined;

  return (
    <>
      <h1>{source ? "Dupliser DVD" : params.wishlist === "true" ? "Legg til ønske" : "Legg til DVD"}</h1>
      <ReleaseForm initial={clone} />
    </>
  );
}
