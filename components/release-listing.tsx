import { SearchToolbar } from "@/components/search-toolbar";
import { InfiniteReleaseGrid } from "@/components/infinite-release-grid";
import { listReleases } from "@/lib/releases";

type ListParams = Record<string, string | undefined>;

export async function ReleaseListing({ params, wishlist }: { params: ListParams; wishlist: boolean }) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "page" && key !== "offset"),
  );
  const result = await listReleases({
    ...cleanParams,
    wishlist,
    offset: 0,
    limit: 20,
    dir: cleanParams.dir === "asc" ? "asc" : "desc",
    cover: cleanParams.cover === "yes" || cleanParams.cover === "no" ? cleanParams.cover : "",
  });

  const basePath = wishlist ? "/wishlist" : "/";
  return (
    <>
      <SearchToolbar values={cleanParams} basePath={basePath} />
      <div className="collection-meta">
        <span className="count-pill">{result.count} {wishlist ? "ønsker" : "registreringer"}</span>
      </div>

      {result.releases.length ? (
        <InfiniteReleaseGrid
          initialReleases={result.releases}
          initialHasMore={result.hasMore}
          total={result.count}
          wishlist={wishlist}
          params={cleanParams}
        />
      ) : (
        <div className="empty">
          <h1>{wishlist ? "Ønskelisten er tom" : "Ingen treff"}</h1>
          <p>{wishlist ? "Legg til en DVD og kryss av «På ønskelisten»." : "Registrer en DVD eller nullstill filtrene."}</p>
        </div>
      )}
    </>
  );
}
