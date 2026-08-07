export const structuredNoteLabels = [
  "Film-combo",
  "Svensk cover",
  "Unrated",
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

const editionSuffixPattern = /\bedition\b/i;

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

function isEditionLabel(label: StructuredNoteLabel) {
  return editionSuffixPattern.test(label);
}

function getEditionLabelPrefix(
  label: StructuredNoteLabel,
) {
  const match = label.match(
    /^(.*?)(?:\s+edition)?$/i,
  );

  return match?.[1].trim() || "";
}

function formatEditionLabels(
  labels: StructuredNoteLabel[],
) {
  const prefixes = labels
    .filter(isEditionLabel)
    .map(getEditionLabelPrefix)
    .filter(Boolean);

  if (!prefixes.length) {
    return null;
  }

  return `${prefixes.join(" ")} Edition`;
}

function getEditionLabelCombinations() {
  const editionLabels = structuredNoteLabels.filter(
    isEditionLabel,
  );

  const combinations: StructuredNoteLabel[][] = [];

  for (
    let mask = (1 << editionLabels.length) - 1;
    mask >= 1;
    mask -= 1
  ) {
    const combination = editionLabels.filter(
      (_, index) => mask & (1 << index),
    );

    combinations.push(combination);
  }

  return combinations.sort(
    (left, right) =>
      right.length - left.length,
  );
}

const editionLabelCombinations =
  getEditionLabelCombinations();

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
    if (isEditionLabel(label)) {
      continue;
    }

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

  for (const labels of editionLabelCombinations) {
    const editionText = formatEditionLabels(labels);

    if (!editionText) {
      continue;
    }

    const pattern = new RegExp(
      `(^|[\\t \\r\\n])${escapeRegExp(editionText)}(?=[\\t \\r\\n]|$)`,
      "i",
    );

    if (!pattern.test(remaining)) {
      continue;
    }

    selectedLabels.push(...labels);
    remaining = remaining
      .replace(pattern, "$1")
      .trim();
    break;
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

  const editionLabels: StructuredNoteLabel[] = [];

  for (const label of structuredNoteLabels) {
    if (!selected.has(label)) {
      continue;
    }

    if (isEditionLabel(label)) {
      editionLabels.push(label);
    } else {
      parts.push(label);
    }
  }

  const editionText =
    formatEditionLabels(editionLabels);

  if (editionText) {
    parts.push(editionText);
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
