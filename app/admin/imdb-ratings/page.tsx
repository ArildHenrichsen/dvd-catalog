"use client";

import { useState } from "react";

type UpdateResult = {
  checked: number;
  updated: number;
  invalidLinks: number;
  missingRating: number;
  failed: number;
  failures?: string[];
};

export default function ImdbRatingsAdminPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(
    null,
  );
  const [error, setError] = useState("");
  const [controller, setController] =
    useState<AbortController | null>(null);

  async function updateMissingRatings() {
    const abortController = new AbortController();

    setController(abortController);
    setBusy(true);
    setError("");
    setResult(null);

    const timeoutId = window.setTimeout(() => {
      abortController.abort();
    }, 240_000);

    try {
      const response = await fetch(
        "/api/admin/imdb-ratings",
        {
          method: "POST",
          signal: abortController.signal,
        },
      );

      const body = (await response
        .json()
        .catch(() => null)) as
        | UpdateResult
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          body && "error" in body && body.error
            ? body.error
            : "IMDb-score kunne ikke oppdateres",
        );
      }

      if (
        !body ||
        !("checked" in body) ||
        !("updated" in body)
      ) {
        throw new Error(
          "Serveren returnerte et ugyldig resultat",
        );
      }

      setResult(body);
    } catch (err) {
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        setError(
          "Oppdateringen ble avbrutt. Noen DVD-er kan allerede ha blitt oppdatert.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "En ukjent feil oppstod",
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setBusy(false);
      setController(null);
    }
  }

  function cancelUpdate() {
    controller?.abort();
  }

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Adminverktøy</p>
          <h1>Oppdater IMDb-scorer</h1>

          <p className="page-intro">
            Finn DVD-er som mangler IMDb-score, og hent
            rating fra IMDbs offisielle ratingsdatasett.
            Bare feltet for IMDb-score blir oppdatert.
          </p>
        </div>

        <a className="button secondary" href="/">
          Tilbake til samlingen
        </a>
      </div>

      <section className="panel admin-tool-panel">
        <h2>Manglende IMDb-scorer</h2>

        <p>
          Verktøyet kontrollerer DVD-er der IMDb-score
          mangler. DVD-er uten gyldig IMDb-lenke blir
          hoppet over.
        </p>

        <div className="admin-warning">
          <strong>Ingen andre DVD-felt endres.</strong>
          <span>
            Tittel, år, cover, region, utgave, merknad og
            IMDb-lenke beholdes som før.
          </span>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={updateMissingRatings}
          >
            {busy
              ? "Oppdaterer IMDb-scorer …"
              : "Oppdater manglende IMDb-scorer"}
          </button>

          {busy && (
            <button
              type="button"
              className="button secondary"
              onClick={cancelUpdate}
            >
              Avbryt
            </button>
          )}
        </div>

        {busy && (
          <p className="field-help" role="status">
            IMDb-datasettet lastes ned og gjennomgås.
            Dette kan ta litt tid.
          </p>
        )}

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        {result && (
          <section
            className="admin-result"
            aria-live="polite"
          >
            <h3>Oppdateringen er ferdig</h3>

            <dl className="admin-result-grid">
              <div>
                <dt>Kontrollert</dt>
                <dd>{result.checked}</dd>
              </div>

              <div>
                <dt>Oppdatert</dt>
                <dd>{result.updated}</dd>
              </div>

              <div>
                <dt>Ugyldig IMDb-lenke</dt>
                <dd>{result.invalidLinks}</dd>
              </div>

              <div>
                <dt>Ingen IMDb-rating</dt>
                <dd>{result.missingRating}</dd>
              </div>

              <div>
                <dt>Feil</dt>
                <dd>{result.failed}</dd>
              </div>
            </dl>

            {result.failures &&
              result.failures.length > 0 && (
                <details className="admin-failures">
                  <summary>Vis tekniske feil</summary>

                  <ul>
                    {result.failures.map(
                      (failure, index) => (
                        <li key={`${failure}-${index}`}>
                          {failure}
                        </li>
                      ),
                    )}
                  </ul>
                </details>
              )}
          </section>
        )}

        <p className="field-help imdb-attribution">
          IMDb-data brukes fra IMDbs offisielle
          ikke-kommersielle datasett.
        </p>
      </section>
    </main>
  );
}