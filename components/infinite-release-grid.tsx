"use client";

import { useEffect, useRef, useState } from "react";
import { ReleaseCard } from "@/components/release-card";
import type { Release } from "@/lib/types";

export function InfiniteReleaseGrid({
  initialReleases,
  initialHasMore,
  total,
  wishlist,
  params,
}: {
  initialReleases: Release[];
  initialHasMore: boolean;
  total: number;
  wishlist: boolean;
  params: Record<string, string | undefined>;
}) {
  const [releases, setReleases] = useState(initialReleases);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setReleases(initialReleases);
    setHasMore(initialHasMore);
    setError("");
  }, [initialReleases, initialHasMore]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !busy) void loadMore();
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, busy, releases.length]);

  async function loadMore() {
    if (busy || !hasMore) return;
    setBusy(true);
    setError("");
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== "page" && key !== "offset") query.set(key, value);
    });
    query.set("offset", String(releases.length));
    query.set("limit", "20");
    query.set("wishlist", String(wishlist));

    try {
      const response = await fetch(`/api/releases/list?${query.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunne ikke laste flere filmer");
      setReleases(current => {
        const known = new Set(current.map(item => item.id));
        return [...current, ...(json.releases as Release[]).filter(item => !known.has(item.id))];
      });
      setHasMore(Boolean(json.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste flere filmer");
    } finally {
      setBusy(false);
    }
  }

  if (!releases.length) return null;

  return (
    <>
      <div className="grid">
        {releases.map(release => <ReleaseCard key={release.id} release={release} />)}
      </div>
      <div ref={sentinel} className="infinite-sentinel" aria-live="polite">
        {busy && <span>Laster flere …</span>}
        {!hasMore && releases.length < total && <span>Alle treff er lastet.</span>}
        {error && (
          <button type="button" onClick={() => void loadMore()}>
            {error} – prøv igjen
          </button>
        )}
      </div>
    </>
  );
}
