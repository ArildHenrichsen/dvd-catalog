import { ReleaseForm } from "@/components/release-form";
import { getRelease } from "@/lib/releases";

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string; wishlist?: string }>;
}) {
  const { duplicate, wishlist } = await searchParams;
  const source = duplicate ? await getRelease(duplicate) : undefined;
  const clone = source
    ? { ...source, id: "", created_at: "", updated_at: "" }
    : wishlist === "true"
      ? {
          id: "",
          original_title: "",
          alternative_title: null,
          release_year: null,
          region: null,
          edition: null,
          imdb_score: null,
          imdb_url: null,
          notes: null,
          cover_path: null,
          is_wishlist: true,
          created_at: "",
          updated_at: "",
        }
      : undefined;

  return (
    <>
      <h1>{source ? "Dupliser DVD" : wishlist === "true" ? "Legg til ønske" : "Legg til DVD"}</h1>
      <ReleaseForm initial={clone} />
    </>
  );
}
