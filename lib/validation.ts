import { z } from "zod";

const currentYear = new Date().getFullYear();

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const optionalNumber = <T extends z.ZodType<number, unknown>>(
  schema: T,
) =>
  z.preprocess(
    (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return value;
    },
    schema.nullable(),
  );

export const releaseSchema = z.object({
  original_title: z
    .string()
    .trim()
    .min(1, "Originaltittel er obligatorisk")
    .max(240),

  alternative_title: optionalText,

  release_year: optionalNumber(
    z.coerce
      .number()
      .int("Utgivelsesår må være et heltall")
      .min(1888, "Utgivelsesår kan ikke være før 1888")
      .max(
        currentYear + 1,
        `Utgivelsesår kan ikke være senere enn ${currentYear + 1}`,
      ),
  ),

  region: optionalText,
  edition: optionalText,

  imdb_score: optionalNumber(
    z.coerce
      .number()
      .min(0, "IMDb-score kan ikke være lavere enn 0")
      .max(10, "IMDb-score kan ikke være høyere enn 10"),
  ),

  notes: optionalText,

  cover_path: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
});

export type ReleaseInput = z.infer<typeof releaseSchema>;