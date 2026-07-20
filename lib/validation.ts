import { z } from "zod";

const currentYear = new Date().getFullYear();
const optionalText = z.string().trim().max(500).optional().nullable().transform(v => v || null);
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(
  value => value === "" || value === undefined || value === null ? null : value,
  z.union([schema, z.null()]),
);

export const releaseSchema = z.object({
  original_title: z.string().trim().min(1, "Originaltittel er obligatorisk").max(240),
  alternative_title: optionalText,
  release_year: optionalNumber(z.coerce.number().int().min(1888).max(currentYear + 1)),
  region: optionalText,
  edition: optionalText,
  imdb_score: optionalNumber(z.coerce.number().min(0).max(10)),
  notes: z.string().trim().max(4000).optional().nullable().transform(v => v || null),
  cover_path: optionalText,
});

export type ReleaseFormValues = z.input<typeof releaseSchema>;
