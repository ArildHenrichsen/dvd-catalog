const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export type MovieSuggestion = {
  tmdb_id: number;
  original_title: string;
  alternative_title: string | null;
  release_year: number | null;
  poster_url: string | null;
  overview: string | null;
  imdb_url: string | null;
  imdb_score: number | null;
  match_reason?: string | null;
};

type TmdbMovie = { id:number; title:string; original_title:string; release_date?:string; poster_path?:string|null; overview?:string; };
type TmdbFindResponse = { movie_results?: TmdbMovie[] };

function getToken(){ const token=process.env.TMDB_READ_ACCESS_TOKEN; if(!token) throw new Error("TMDB_READ_ACCESS_TOKEN mangler på serveren"); return token; }
async function tmdbFetch(path:string, searchParams?:Record<string,string>){ const url=new URL(`${TMDB_BASE_URL}${path}`); for(const [k,v] of Object.entries(searchParams??{})) url.searchParams.set(k,v); const response=await fetch(url,{headers:{Authorization:`Bearer ${getToken()}`,accept:"application/json"},next:{revalidate:3600}}); if(!response.ok){console.error("TMDB request failed",response.status,path,await response.text()); throw new Error("Filmdatabasen kunne ikke nås");} return response.json(); }
function imdbUrl(id?:string|null){ return id ? `https://www.imdb.com/title/${id}/` : null; }
async function externalImdbId(tmdbId:number){ const p=await tmdbFetch(`/movie/${tmdbId}/external_ids`) as {imdb_id?:string|null}; return p.imdb_id??null; }
async function toSuggestion(movie:TmdbMovie, matchReason?:string, knownImdbId?:string|null, score:number|null=null):Promise<MovieSuggestion>{ const id=knownImdbId ?? await externalImdbId(movie.id).catch(()=>null); return {tmdb_id:movie.id,original_title:movie.original_title,alternative_title:movie.title&&movie.title!==movie.original_title?movie.title:null,release_year:movie.release_date?Number(movie.release_date.slice(0,4))||null:null,poster_url:movie.poster_path?`https://image.tmdb.org/t/p/w342${movie.poster_path}`:null,overview:movie.overview||null,imdb_url:imdbUrl(id),imdb_score:score,match_reason:matchReason??null}; }
export async function searchTmdbMovies(query:string,options?:{limit?:number;matchReason?:string}):Promise<MovieSuggestion[]>{ const payload=await tmdbFetch("/search/movie",{query,language:"nb-NO",include_adult:"false",page:"1"}) as {results?:TmdbMovie[]}; return Promise.all((payload.results??[]).slice(0,options?.limit??8).map(m=>toSuggestion(m,options?.matchReason))); }
export async function findTmdbMovieByImdbId(imdbId:string, imdbScore:number|null=null):Promise<MovieSuggestion[]>{ const payload=await tmdbFetch(`/find/${encodeURIComponent(imdbId)}`,{external_source:"imdb_id",language:"nb-NO"}) as TmdbFindResponse; return Promise.all((payload.movie_results??[]).slice(0,3).map(m=>toSuggestion(m,`Direkte treff via IMDb (${imdbId})`,imdbId,imdbScore))); }
