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
  manual_keywords: z.preprocess(
    value => normalizeKeywordInput(value),
    z.array(z.string().trim().min(1).max(64)).nullable().optional(),
  ),
});

export type ReleaseFormValues = z.input<typeof releaseSchema>;
