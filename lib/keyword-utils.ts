export function parseImdbId(value?: string | null) {
  if (!value) return null;
  const match = value.match(/tt\d{7,10}/i);
  return match ? match[0].toLowerCase() : null;
}

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['"`.,:;!?()[\]{}]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKeyword(value: string) {
  return normalizeToken(value).replace(/\s+/g, "-");
}

export function splitKeywordInput(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map(v => normalizeToken(v))
    .filter(Boolean);
}

export function uniqueKeywords(values: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const token = normalizeKeyword(value);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

export function effectiveKeywords(manual?: string[] | null, auto?: string[] | null) {
  const manualNormalized = uniqueKeywords((manual ?? []).map(v => normalizeToken(v)));
  const autoNormalized = uniqueKeywords((auto ?? []).map(v => normalizeToken(v)));
  const seen = new Set(manualNormalized);
  const merged = [...manualNormalized];
  for (const token of autoNormalized) {
    if (seen.has(token)) continue;
    seen.add(token);
    merged.push(token);
  }
  return merged;
}

export type DiversityCandidate = {
  id: string;
  score: number;
  keywords: string[];
};

function overlap(a: string[], b: string[]) {
  if (!a.length && !b.length) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let shared = 0;
  for (const token of aSet) if (bSet.has(token)) shared++;
  const union = new Set([...aSet, ...bSet]).size || 1;
  return shared / union;
}

export function pickBestDiversePair(candidates: DiversityCandidate[]) {
  if (candidates.length < 2) return null;
  let best: [DiversityCandidate, DiversityCandidate] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const similarity = overlap(a.keywords, b.keywords);
      const pairScore = a.score + b.score + (1 - similarity) * 1.6;
      if (pairScore > bestScore) {
        bestScore = pairScore;
        best = [a, b];
      }
    }
  }
  return best;
}
