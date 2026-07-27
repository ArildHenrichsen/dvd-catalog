"use client";

import { useState } from "react";

type Props = {
  releaseId: string;
  imdbUrl?: string | null;
  onUpdated?: (score: number) => void;
};

export function ImdbScoreButton({
  releaseId,
  imdbUrl,
  onUpdated,
}: Props) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] =
    useState<string>("");

  if (!imdbUrl) {
    return (
      <p className="field-help">
        Legg inn IMDb-lenke for å hente score.
      </p>
    );
  }

  async function updateScore() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(
        `/api/imdb-ratings/${releaseId}`,
        {
          method: "POST",
          signal: AbortSignal.timeout(120_000),
        },
      );

      const body = (await response.json()) as {
        imdbScore?: number;
        votes?: number;
        error?: string;
      };

      if (!response.ok || body.imdbScore == null) {
        throw new Error(
          body.error ?? "IMDb-score kunne ikke hentes",
        );
      }

      onUpdated?.(body.imdbScore);
      setStatus("success");
      setMessage(
        `IMDb-score ${body.imdbScore.toFixed(1)} hentet`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "IMDb-score kunne ikke hentes",
      );
    }
  }

  return (
    <div className="imdb-score-tool">
      <button
        type="button"
        className="button secondary compact"
        disabled={status === "loading"}
        onClick={updateScore}
      >
        {status === "loading"
          ? "Henter IMDb-score …"
          : "Hent IMDb-score"}
      </button>

      {message && (
        <p
          className={
            status === "error"
              ? "form-error"
              : "form-success"
          }
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}