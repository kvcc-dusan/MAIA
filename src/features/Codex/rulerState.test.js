import { describe, expect, it } from "vitest";
import { rulerState } from "./rulerState.js";

describe("rulerState", () => {
  it("hides the ruler when the note fits", () => {
    expect(rulerState({ scrollTop: 0, scrollHeight: 600, clientHeight: 600 })).toBeNull();
    expect(rulerState({ scrollTop: 0, scrollHeight: 700, clientHeight: 600 })).toBeNull();
    expect(rulerState({ scrollTop: 0, scrollHeight: 100, clientHeight: 0 })).toBeNull();
  });

  it("scales the tick count with length, within bounds", () => {
    expect(rulerState({ scrollTop: 0, scrollHeight: 1000, clientHeight: 600 }).count).toBe(6);
    expect(rulerState({ scrollTop: 0, scrollHeight: 3200, clientHeight: 600 }).count).toBe(20);
    expect(rulerState({ scrollTop: 0, scrollHeight: 90000, clientHeight: 600 }).count).toBe(40);
  });

  it("puts the active tick at the first, middle and last position", () => {
    const base = { scrollHeight: 3200, clientHeight: 600 };
    expect(rulerState({ ...base, scrollTop: 0 }).active).toBe(0);
    expect(rulerState({ ...base, scrollTop: 1300 }).active).toBe(10);
    expect(rulerState({ ...base, scrollTop: 2600 }).active).toBe(19);
  });
});
