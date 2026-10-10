import { describe, expect, it } from "vitest";
import { estimateOptionsFor, formatEstimate } from "./estimates";

describe("formatEstimate", () => {
  it("formats estimates", () => {
    expect(formatEstimate("S")).toBe("S");
    expect(formatEstimate(null)).toBeNull();
  });
});

describe("estimateOptionsFor", () => {
  it("offers S, M and L", () => {
    expect(estimateOptionsFor("M").map((o) => o.value)).toEqual(["S", "M", "L"]);
    expect(estimateOptionsFor(null).map((o) => o.value)).toEqual(["S", "M", "L"]);
  });
  it("keeps an unknown stored value selectable", () => {
    expect(estimateOptionsFor(5).map((o) => o.value)).toEqual(["S", "M", "L", "5"]);
  });
});
