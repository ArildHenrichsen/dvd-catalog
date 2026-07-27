import Link from "next/link";

export default function SettingsPage() {
  return (
    <article className="detail">
      <Link
        className="back-link"
        href="/"
      >
        ← Tilbake til DVD-samlingen
      </Link>

      <header className="edit-release-heading">
        <span className="eyebrow">
          Innstillinger
        </span>

        <h1>Innstillinger og verktøy</h1>

        <p className="muted">
          Administrer skrivetilgang og kjør
          vedlikeholdsverktøy for samlingen.
        </p>
      </header>

      <section className="panel admin-tool-panel">
        <div>
          <h2>Skrivetilgang</h2>

          <p className="muted">
            Aktiver eller oppdater skrivetilgang
            for å kunne legge til og redigere
            DVD-er.
          </p>

          <Link
            className="button"
            href="/unlock"
          >
            Administrer skrivetilgang
          </Link>
        </div>

        <div className="admin-result">
          <h2>IMDb-score</h2>

          <p className="muted">
            Finn registrerte filmer uten
            IMDb-score og oppdater dem samlet.
          </p>

          <Link
            className="button primary"
            href="/admin/imdb-ratings"
          >
            Oppdater manglende IMDb-score
          </Link>
        </div>
      </section>
    </article>
  );
}