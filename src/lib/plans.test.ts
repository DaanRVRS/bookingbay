import { describe, expect, it } from "vitest";
import { exclVat, priceInclExclLabel, splitVatCents } from "./plans";

describe("btw-helpers", () => {
  it("rekent incl. → excl. btw af op centen", () => {
    expect(exclVat(24.99)).toBe(20.65);
    expect(exclVat(59.99)).toBe(49.58);
    expect(exclVat(109.99)).toBe(90.9);
  });

  it("splitst bruto centen zodat netto + btw exact het bruto bedrag is", () => {
    const { netCents, vatCents } = splitVatCents(2499);
    expect(netCents + vatCents).toBe(2499);
    expect(netCents).toBe(2065);
    expect(vatCents).toBe(434);
  });

  it("formatteert incl. en excl. in één label", () => {
    expect(priceInclExclLabel(24.99)).toContain("24,99");
    expect(priceInclExclLabel(24.99)).toContain("20,65");
  });
});
