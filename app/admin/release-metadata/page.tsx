"use client";

import { useState } from "react";

type BulkResult = {
  dryRun: boolean;
  onlyMissing: boolean;
  batchSize: number;
  candidates: number;
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  failures?: string[];
};

export default function ReleaseMetadataAdminPage() {
  const [busy, setBusy] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [onlyMissing, setOnlyMissing] =
    useState(true);
  const [batchSize, setBatchSize] = useState("20");
  const [result, setResult] =
    useState<BulkResult | null>(null);
  const [error, setError] = useState("");

  async function runBulkEnrichment() {
    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/release-metadata",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            dryRun,
            onlyMissing,
            batchSize: Number(batchSize),
          }),
        },
      );

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.error ||
            "Kunne ikke kjøre metadata-jobben",
        );
      }

      setResult(json as BulkResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "En ukjent feil oppstod",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Adminverktøy</p>
          <h1>Bulk-berik DVD-metadata</h1>
          <p className="page-intro">
            Fyll inn oversikt, spilletid,
            sjangre og automatiske nøkkelord
            fra TMDB for flere DVD-er.
          </p>
        </div>

        <a
          className="button secondary"
          href="/settings"
        >
          Tilbake til innstillinger
        </a>
      </div>

      <section className="panel admin-tool-panel">
        <h2>Jobbinnstillinger</h2>

        <label className="wishlist-toggle">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(event) =>
              setOnlyMissing(
                event.target.checked,
              )
            }
          />
          <span className="wishlist-toggle-copy">
            <strong>Kun manglende felt</strong>
            <small>
              Beholder eksisterende metadata når
              feltet allerede er fylt.
            </small>
          </span>
        </label>

        <label className="wishlist-toggle">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(event) =>
              setDryRun(
                event.target.checked,
              )
            }
          />
          <span className="wishlist-toggle-copy">
            <strong>Dry-run</strong>
            <small>
              Vis hva som ville blitt oppdatert
              uten å lagre.
            </small>
          </span>
        </label>

        <label>
          Maks antall DVD-er i denne kjøringen
          <input
            type="number"
            min="1"
            max="100"
            value={batchSize}
            onChange={(event) =>
              setBatchSize(
                event.target.value,
              )
            }
          />
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={runBulkEnrichment}
          >
            {busy
              ? "Kjører metadatajobb …"
              : "Start bulk-berikelse"}
          </button>
        </div>

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
            <h3>
              {result.dryRun
                ? "Dry-run fullført"
                : "Metadatajobb fullført"}
            </h3>

            <dl className="admin-result-grid">
              <div>
                <dt>Kandidater</dt>
                <dd>{result.candidates}</dd>
              </div>
              <div>
                <dt>Batchstørrelse</dt>
                <dd>{result.batchSize}</dd>
              </div>
              <div>
                <dt>Behandlet</dt>
                <dd>{result.processed}</dd>
              </div>
              <div>
                <dt>Oppdatert</dt>
                <dd>{result.updated}</dd>
              </div>
              <div>
                <dt>Hoppet over</dt>
                <dd>{result.skipped}</dd>
              </div>
              <div>
                <dt>Feilet</dt>
                <dd>{result.failed}</dd>
              </div>
            </dl>

            {result.failures &&
              result.failures.length > 0 && (
                <details className="admin-failures">
                  <summary>
                    Vis tekniske feil
                  </summary>
                  <ul>
                    {result.failures.map(
                      (failure, index) => (
                        <li
                          key={`${failure}-${index}`}
                        >
                          {failure}
                        </li>
                      ),
                    )}
                  </ul>
                </details>
              )}
          </section>
        )}
      </section>
    </main>
  );
}
