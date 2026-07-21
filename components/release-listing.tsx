import { ReleaseCard } from "@/components/release-card";
import { SearchToolbar } from "@/components/search-toolbar";
import { listReleases } from "@/lib/releases";

type ListParams = Record<string, string | undefined>;

export async function ReleaseListing({
  params,
  wishlist,
}: {
  params: ListParams;
  wishlist: boolean;
}) {
  const result = await listReleases({
    ...params,
    wishlist,
    page: Number(params.page || 1),
    dir: params.dir === "asc" ? "asc" : "desc",
    cover: params.cover === "yes" || params.cover === "no" ? params.cover : "",
  });

  const basePath = wishlist ? "/wishlist" : "/";
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const pageHref = (page: number) => {
    const query = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
      page: String(page),
    } as Record<string, string>).toString();
    return `${basePath}?${query}`;
  };

  return (
    <>
      <SearchToolbar values={params} basePath={basePath} />
      <div className="collection-meta">
        <span className="count-pill">
          {result.count} {wishlist ? "ønsker" : "registreringer"}
        </span>
      </div>

      {result.releases.length ? (
        <div className="grid">
          {result.releases.map(release => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h1>{wishlist ? "Ønskelisten er tom" : "Ingen treff"}</h1>
          <p>
            {wishlist
              ? "Legg til en DVD og kryss av «På ønskelisten»."
              : "Registrer en DVD eller nullstill filtrene."}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="actions" style={{ marginTop: "1rem" }} aria-label="Sider">
          {result.page > 1 && (
            <a className="button" href={pageHref(result.page - 1)}>Forrige</a>
          )}
          <span className="button">Side {result.page} av {totalPages}</span>
          {result.page < totalPages && (
            <a className="button" href={pageHref(result.page + 1)}>Neste</a>
          )}
        </nav>
      )}
    </>
  );
}
