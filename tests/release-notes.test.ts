import { describe, expect, it } from "vitest";
import {
  formatReleaseNotes,
  parseReleaseNotes,
} from "../lib/release-notes";

describe("release note helpers", () => {
  it("bygger teksten for eksempelet", () => {
    expect(
      formatReleaseNotes({
        discCount: 2,
        selectedLabels: [
          "Extended",
          "Collector's Edition",
        ],
        customText: "",
      }),
    ).toBe(
      "2-disc Extended Collector's Edition",
    );
  });

  it("utelater 1-disc-prefiks", () => {
    expect(
      formatReleaseNotes({
        discCount: 1,
        selectedLabels: ["Extended"],
        customText: "",
      }),
    ).toBe("Extended");
  });

  it("tillater tom merknad når ingenting er valgt", () => {
    expect(
      formatReleaseNotes({
        discCount: 1,
        selectedLabels: [],
        customText: "",
      }),
    ).toBeNull();
  });

  it("beholder stabil etikett-rekkefølge", () => {
    expect(
      formatReleaseNotes({
        discCount: 2,
        selectedLabels: [
          "Collector's Edition",
          "Extended",
          "Film-combo",
        ],
        customText: "",
      }),
    ).toBe(
      "2-disc Film-combo Extended Collector's Edition",
    );
  });

  it("prefyller kontroller og bevarer ukjent fritekst", () => {
    expect(
      parseReleaseNotes(
        "2-disc Extended Collector's Edition Svensk cover",
      ),
    ).toEqual({
      discCount: 2,
      selectedLabels: [
        "Extended",
        "Collector's Edition",
      ],
      customText: "Svensk cover",
    });
  });

  it("kan bygge opp igjen tekst med fritekst", () => {
    expect(
      formatReleaseNotes(
        parseReleaseNotes(
          "2-disc Extended Collector's Edition Svensk cover",
        ),
      ),
    ).toBe(
      "2-disc Extended Collector's Edition Svensk cover",
    );
  });

  it("bevarer linjeskift i egen fritekst", () => {
    expect(
      formatReleaseNotes({
        discCount: 2,
        selectedLabels: ["Extended"],
        customText:
          "Svensk cover\nSlipcase følger med",
      }),
    ).toBe(
      "2-disc Extended\nSvensk cover\nSlipcase følger med",
    );
  });
});
