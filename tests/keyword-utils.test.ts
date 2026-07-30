import { describe, expect, it } from "vitest";
import { effectiveKeywords, pickBestDiversePair, splitKeywordInput } from "../lib/keyword-utils";

describe("keyword utils", () => {
  it("prioriterer manuelle nøkkelord i effektiv liste", () => {
    expect(effectiveKeywords(["Genre:Action", "neo noir"], ["genre:action", "cast:keanu-reeves"])).toEqual([
      "genre-action",
      "neo-noir",
      "cast-keanu-reeves",
    ]);
  });

  it("splitter manuelle nøkkelord fra tekst", () => {
    expect(splitKeywordInput(" action , sci fi,neo noir ")).toEqual(["action", "sci fi", "neo noir"]);
  });

  it("velger mer diverse par når score er lik", () => {
    const pair = pickBestDiversePair([
      { id: "a", score: 1, keywords: ["genre-action", "theme-heist"] },
      { id: "b", score: 1, keywords: ["genre-action", "theme-heist"] },
      { id: "c", score: 1, keywords: ["genre-drama", "theme-romance"] },
    ]);
    expect(pair?.map(item => item.id).sort()).toEqual(["a", "c"]);
  });
});
