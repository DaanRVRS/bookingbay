import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  DARK_ON_ACCENT,
  LIGHT_ON_ACCENT,
  onAccentColor,
} from "./contrast";

describe("contrastRatio", () => {
  it("geeft 21 voor zwart op wit", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("accepteert 3-cijferige hex", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 0);
  });

  it("geeft null bij ongeldige hex", () => {
    expect(contrastRatio("rood", "#fff")).toBeNull();
  });
});

describe("onAccentColor", () => {
  it("kiest donkere tekst op het lichte standaard-koraal (#ef5934 haalt geen 4,5:1 met wit)", () => {
    expect(onAccentColor("#ef5934")).toBe(DARK_ON_ACCENT);
  });

  it("kiest witte tekst op een donker accent", () => {
    expect(onAccentColor("#1f2937")).toBe(LIGHT_ON_ACCENT);
    expect(onAccentColor("#c8431f")).toBe(LIGHT_ON_ACCENT);
  });

  it("valt terug op wit bij ongeldige invoer", () => {
    expect(onAccentColor("")).toBe(LIGHT_ON_ACCENT);
  });
});
