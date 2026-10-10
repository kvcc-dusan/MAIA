import { describe, expect, it } from "vitest";
import { nextFocusId, resolveActiveId } from "./navigation.js";

const item = (id, row, mid) => ({ id, row, mid });
const lanes = [
  [item("a", 0, 10), item("b", 0, 40), item("c", 1, 30)],
  [],
  [item("d", 0, 12), item("e", 0, 80)],
];

describe("nextFocusId", () => {
  it("walks a lane in time order with left and right", () => {
    expect(nextFocusId(lanes, "a", "ArrowRight")).toBe("c");
    expect(nextFocusId(lanes, "c", "ArrowRight")).toBe("b");
    expect(nextFocusId(lanes, "b", "ArrowLeft")).toBe("c");
  });

  it("stops at the ends of a lane", () => {
    expect(nextFocusId(lanes, "a", "ArrowLeft")).toBeNull();
    expect(nextFocusId(lanes, "b", "ArrowRight")).toBeNull();
  });

  it("jumps to the first and last item with Home and End", () => {
    expect(nextFocusId(lanes, "c", "Home")).toBe("a");
    expect(nextFocusId(lanes, "c", "End")).toBe("b");
    expect(nextFocusId(lanes, "a", "Home")).toBeNull();
  });

  it("moves down a sub row inside a lane before leaving it", () => {
    expect(nextFocusId(lanes, "b", "ArrowDown")).toBe("c");
    expect(nextFocusId(lanes, "c", "ArrowUp")).toBe("b");
  });

  it("skips empty lanes and lands on the closest item by position", () => {
    expect(nextFocusId(lanes, "c", "ArrowDown")).toBe("d");
    expect(nextFocusId(lanes, "e", "ArrowUp")).toBe("c");
  });

  it("does not move past the first or last row", () => {
    expect(nextFocusId(lanes, "a", "ArrowUp")).toBeNull();
    expect(nextFocusId(lanes, "e", "ArrowDown")).toBeNull();
  });

  it("ignores other keys and unknown ids", () => {
    expect(nextFocusId(lanes, "a", "Enter")).toBeNull();
    expect(nextFocusId(lanes, "missing", "ArrowRight")).toBeNull();
  });
});

describe("resolveActiveId", () => {
  it("keeps a remembered item that still exists", () => {
    expect(resolveActiveId(lanes, "e")).toBe("e");
  });

  it("falls back to the first item of the first lane that has one", () => {
    expect(resolveActiveId(lanes, "gone")).toBe("a");
    expect(resolveActiveId([[], [item("z", 0, 5)]], null)).toBe("z");
  });

  it("is null when nothing is on the chart", () => {
    expect(resolveActiveId([[], []], null)).toBeNull();
  });
});
