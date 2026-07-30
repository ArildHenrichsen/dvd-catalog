import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  enrichDvdMetadata,
  getMissingMetadataFields,
} from "../lib/metadata-enrichment";

describe("metadata enrichment", () => {
  beforeEach(() => {
    process.env.TMDB_READ_ACCESS_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills missing metadata fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: 42,
          title: "Alien",
          original_title: "Alien",
          release_date: "1979-05-25",
          overview: "Crew møter xenomorph.",
          runtime: 117,
          genres: [{ name: "Science Fiction" }],
          external_ids: {
            imdb_id: "tt0078748",
          },
          keywords: {
            keywords: [{ name: "space" }],
          },
          credits: {
            cast: [{ name: "Sigourney Weaver" }],
            crew: [{ name: "Ridley Scott", job: "Director" }],
          },
        }),
      })),
    );

    const result = await enrichDvdMetadata(
      {
        original_title: "Alien",
        metadata_provider: "tmdb",
        metadata_provider_id: "42",
      },
      {
        provider: "tmdb",
        providerId: "42",
      },
    );

    expect(result.metadata.overview).toBe(
      "Crew møter xenomorph.",
    );
    expect(result.metadata.runtime_minutes).toBe(
      117,
    );
    expect(result.metadata.genres).toEqual([
      "Science Fiction",
    ]);
    expect(result.metadata.imdb_url).toBe(
      "https://www.imdb.com/title/tt0078748/",
    );
    expect(result.metadata.auto_keywords).toEqual(
      expect.arrayContaining([
        "genre-science-fiction",
        "theme-space",
        "cast-sigourney-weaver",
        "director-ridley-scott",
      ]),
    );
  });

  it("does not overwrite manual or existing values by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: 42,
          title: "Alien",
          original_title: "Alien",
          release_date: "1979-05-25",
          overview: "Auto overview",
          runtime: 117,
          genres: [{ name: "Science Fiction" }],
          external_ids: {
            imdb_id: "tt0078748",
          },
          keywords: {
            keywords: [{ name: "space" }],
          },
          credits: {
            cast: [],
            crew: [],
          },
        }),
      })),
    );

    const result = await enrichDvdMetadata(
      {
        original_title: "Alien",
        overview: "Min egen tekst",
        runtime_minutes: 120,
        genres: ["Custom"],
        metadata_provider: "tmdb",
        metadata_provider_id: "42",
      },
      {
        provider: "tmdb",
        providerId: "42",
      },
      {
        protectedFields: ["overview"],
      },
    );

    expect(result.metadata.overview).toBe(
      "Min egen tekst",
    );
    expect(result.metadata.runtime_minutes).toBe(
      120,
    );
    expect(result.metadata.genres).toEqual([
      "Custom",
    ]);
    expect(result.metadata.auto_keywords).toEqual(
      ["genre-science-fiction", "theme-space", "era-1970s"],
    );
  });

  it("reports missing metadata fields", () => {
    expect(
      getMissingMetadataFields({
        original_title: "Alien",
        overview: null,
        runtime_minutes: null,
        genres: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        "alternative_title",
        "release_year",
        "imdb_url",
        "overview",
        "runtime_minutes",
        "genres",
      ]),
    );
  });
});
