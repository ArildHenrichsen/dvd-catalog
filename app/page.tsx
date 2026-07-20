import { ReleaseCard } from "@/components/release-card";
import { SearchToolbar } from "@/components/search-toolbar";
import { listReleases } from "@/lib/releases";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const params = await searchParams;
  const result = await listReleases({ ...params, page: Number(params.page || 1), dir: params.dir === "asc" ? "asc" : "desc", cover: params.cover === "yes" || params.cover === "no" ? params.cover : "" });
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const pageHref = (page:number) => `/?${new URLSearchParams({...Object.fromEntries(Object.entries(params).filter(([,v])=>v)), page:String(page)} as Record<string,string>).toString()}`;
  return <>
    <SearchToolbar values={params} />
    <p className="muted">{result.count} registreringer</p>
    {result.releases.length ? <div className="grid">{result.releases.map(r => <ReleaseCard key={r.id} release={r} />)}</div> : <div className="empty"><h1>Ingen treff</h1><p>Registrer en DVD eller nullstill filtrene.</p></div>}
    {totalPages > 1 && <nav className="actions" style={{marginTop:"1rem"}}>{result.page > 1 && <a className="button" href={pageHref(result.page-1)}>Forrige</a>}<span className="button">Side {result.page} av {totalPages}</span>{result.page < totalPages && <a className="button" href={pageHref(result.page+1)}>Neste</a>}</nav>}
  </>;
}
