export const structuredNoteLabels = [
  "Film-combo",
  "Extended",
  "Director's cut",
  "Special Edition",
  "Collector's Edition",
  "Ultimate Edition",
] as const;

export type StructuredNoteLabel =
  (typeof structuredNoteLabels)[number];

export type ParsedReleaseNotes = {
  discCount: number;
  selectedLabels: StructuredNoteLabel[];
  customText: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDiscCount(value: number) {
  return Number.isInteger(value) && value >= 2 && value <= 6
    ? value
    : 1;
}

function normalizeCustomText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/[ \t]+/g, " ").trim(),
    )
    .filter(Boolean)
    .join("\n");
}

export function parseReleaseNotes(
  note: string | null | undefined,
): ParsedReleaseNotes {
  let remaining = (note || "").trim();
  let discCount = 1;

  const discMatch = remaining.match(
    /^([2-6])-disc(?:\s+|$)/i,
  );

  if (discMatch) {
    discCount = normalizeDiscCount(
      Number(discMatch[1]),
    );
    remaining = remaining
      .slice(discMatch[0].length)
      .trim();
  }

  const selectedLabels: StructuredNoteLabel[] = [];

  for (const label of structuredNoteLabels) {
    const pattern = new RegExp(
      `(^|[\\t \\r\\n])${escapeRegExp(label)}(?=[\\t \\r\\n]|$)`,
      "i",
    );

    if (!pattern.test(remaining)) {
      continue;
    }

    selectedLabels.push(label);
    remaining = remaining
      .replace(pattern, "$1")
      .trim();
  }

  return {
    discCount,
    selectedLabels,
    customText: normalizeCustomText(remaining),
  };
}

export function formatReleaseNotes({
  discCount,
  selectedLabels,
  customText,
}: ParsedReleaseNotes): string | null {
  const normalizedDiscCount =
    normalizeDiscCount(discCount);
  const normalizedCustomText =
    normalizeCustomText(customText);
  const selected = new Set(selectedLabels);
  const parts: string[] = [];

  if (normalizedDiscCount > 1) {
    parts.push(`${normalizedDiscCount}-disc`);
  }

  for (const label of structuredNoteLabels) {
    if (selected.has(label)) {
      parts.push(label);
    }
  }

  const structuredNote = parts.join(" ");

  if (!structuredNote) {
    return normalizedCustomText || null;
  }

  if (!normalizedCustomText) {
    return structuredNote;
  }

  return normalizedCustomText.includes("\n")
    ? `${structuredNote}\n${normalizedCustomText}`
    : `${structuredNote} ${normalizedCustomText}`;
}
