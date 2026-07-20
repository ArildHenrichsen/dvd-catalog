export type Release = {
  id: string;
  original_title: string;
  alternative_title: string | null;
  release_year: number | null;
  region: string | null;
  edition: string | null;
  imdb_score: number | null;
  notes: string | null;
  cover_path: string | null;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type ReleaseInput = {
  original_title: string;
  alternative_title?: string | null;
  release_year?: number | null;
  region?: string | null;
  edition?: string | null;
  imdb_score?: number | null;
  notes?: string | null;
  cover_path?: string | null;
};
