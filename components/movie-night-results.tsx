import type { Release } from "@/lib/types";
import { ReleaseCard } from "./release-card";

export function MovieNightResults({
  themeTitle,
  themeDescription,
  films,
}: {
  themeTitle: string;
  themeDescription?: string;
  films: Array<{ release: Release; reason: string }>;
}) {
  return (
    <div className="movie-night-results">
      <header>
        <h1>{themeTitle}</h1>
        {themeDescription && <p className="muted">{themeDescription}</p>}
      </header>

      <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        {films.map(f => (
          <div key={f.release.id}>
            <ReleaseCard release={f.release} />
            <p className="muted small" style={{ marginTop: "0.5rem" }}>
              {f.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 082fea74e1dbafce28280b5fc2a32ba8782142ef
