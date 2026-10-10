import { describe, expect, it } from "vitest";
import { PRIORITY_OPTIONS_SHORT, statusLabel } from "./taskDisplay.js";

describe("PRIORITY_OPTIONS_SHORT", () => {
  it("strips the word priority and keeps values and colors", () => {
    expect(PRIORITY_OPTIONS_SHORT.map((p) => [p.value, p.label])).toEqual([
      ["p1", "High"],
      ["p2", "Medium"],
      ["p3", "Normal"],
    ]);
    expect(PRIORITY_OPTIONS_SHORT[0].color).toBe("var(--priority-1)");
  });
});

describe("statusLabel", () => {
  it("names the four statuses and falls back to To do", () => {
    expect(statusLabel("doing")).toBe("In progress");
    expect(statusLabel("blocked")).toBe("Blocked");
    expect(statusLabel("done")).toBe("Done");
    expect(statusLabel(undefined)).toBe("To do");
  });
});
