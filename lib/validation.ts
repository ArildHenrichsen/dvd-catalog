import { z } from "zod";

const currentYear = new Date().getFullYear();
const optionalText = z.string().trim().max(500).optional().nullable().transform(v => v || null);
const optionalNumber = (schema: z.ZodType<number, unknown>) => z.preprocess(
  value => value === "" || value === undefined || value === null ? null : value,
  z.union([schema, z.null()]),
);

const checkboxBoolean = z.preprocess(
  value => value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);

export const metadataManualFieldNames = [
  "original_title",
  "alternative_title",
  "release_year",
  "imdb_url",
  "overview",
  "runtime_minutes",
  "genres",
] as const;

const metadataManualFieldSchema = z.enum(
  metadataManualFieldNames,
);

function normalizeKeywordInput(value: unknown): string[] | null {
  if (value === null || value === undefined || value === "") return null;
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of source) {
    const token = String(item).trim().toLowerCase();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    normalized.push(token);
  }
  return normalized.length ? normalized : null;
}

function normalizeTextList(
  value: unknown,
): string[] | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of source) {
    const token = String(item).trim();
    const key = token.toLocaleLowerCase("nb-NO");

    if (!token || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(token);
  }

  return normalized.length ? normalized : null;
}

export const releaseSchema = z.object({
  is_wishlist: checkboxBoolean.default(false),
  original_title: z.string().trim().min(1, "Originaltittel er obligatorisk").max(240),
  alternative_title: optionalText,
  release_year: optionalNumber(z.coerce.number().int().min(1888).max(currentYear + 1)),
  region: optionalText,
  edition: optionalText,
  imdb_score: optionalNumber(z.coerce.number().min(0).max(10)),
  imdb_url: z.string().trim().url("Ugyldig IMDb-lenke").regex(/^https:\/\/(www\.)?imdb\.com\/title\/tt\d{7,10}\/?$/i, "IMDb-lenken må peke til en IMDb-tittelside").optional().nullable().transform(v => v || null),
  notes: z.string().trim().max(4000).optional().nullable().transform(v => v || null),
  cover_path: optionalText,
  thumbnail_path: optionalText,
  overview: z.string().trim().max(6000).optional().nullable().transform(v => v || null),
  runtime_minutes: optionalNumber(z.coerce.number().int().min(1).max(999)),
  genres: z.preprocess(
    value => normalizeTextList(value),
    z.array(z.string().trim().min(1).max(80)).nullable().optional(),
  ),
  manual_keywords: z.preprocess(
    value => normalizeKeywordInput(value),
    z.array(z.string().trim().min(1).max(64)).nullable().optional(),
  ),
  metadata_provider: z.string().trim().max(64).optional().nullable().transform(v => v || null),
  metadata_provider_id: z.string().trim().max(64).optional().nullable().transform(v => v || null),
  metadata_manual_fields: z.preprocess(
    value => normalizeTextList(value),
    z.array(metadataManualFieldSchema).nullable().optional(),
  ),
});

export type ReleaseFormValues = z.input<typeof releaseSchema>;
