import { describe, expect, it } from "vitest";
import { LABEL_PRIORITY, changedBeyond, estimateLabelSize, layoutLabels, stepToward } from "./labelLayout.js";

const viewport = { width: 800, height: 600 };
const c = (id, x, y, extra = {}) => ({ id, title: id, x, y, width: 80, height: 14, priority: LABEL_PRIORITY.normal, degree: 1, ...extra });
const run = (candidates, cap = 60) => layoutLabels({ candidates, viewport, cap });

describe("layoutLabels with a score", () => {
  it("lets the node nearer the viewer win a contested spot over a bigger hub", () => {
    const result = run([
      c("hub-behind", 100, 100, { degree: 9, score: 0.2 }),
      c("near", 104, 102, { degree: 1, score: 1.2 }),
    ]);
    expect(result).toEqual(["near"]);
  });

  it("keeps a label that is already showing when scores are close (sticky bonus is part of the score)", () => {
    const result = run([
      c("shown", 100, 100, { score: 0.9 + 0.25 }),
      c("rival", 103, 101, { score: 1.0 }),
    ]);
    expect(result).toEqual(["shown"]);
  });
});

describe("layoutLabels", () => {
  it("accepts labels that do not touch", () => {
    expect(run([c("a", 100, 100), c("b", 300, 100), c("c", 100, 300)])).toEqual(["a", "b", "c"]);
  });

  it("rejects a label overlapping an accepted one, keeping the bigger hub", () => {
    const result = run([c("small", 105, 104, { degree: 1 }), c("hub", 100, 100, { degree: 9 })]);
    expect(result).toEqual(["hub"]);
  });

  it("keeps a gap of the padding between neighbours", () => {
    // 80 wide: centres 82 apart leave 2px, which is less than the 4px padding
    expect(run([c("a", 100, 100, { degree: 2 }), c("b", 182, 100)])).toEqual(["a"]);
    expect(run([c("a", 100, 100, { degree: 2 }), c("b", 185, 100)])).toEqual(["a", "b"]);
  });

  it("orders by priority, then degree, then title", () => {
    const result = run([
      c("z", 100, 100, { degree: 3 }), c("a", 300, 100, { degree: 3 }), c("hub", 500, 100, { degree: 8 }),
      c("lit", 100, 300, { degree: 0, priority: LABEL_PRIORITY.emphasised }),
    ]);
    expect(result).toEqual(["lit", "hub", "a", "z"]);
  });

  it("always accepts the hovered label first, even over a bigger hub", () => {
    const result = run([
      c("hub", 100, 100, { degree: 50 }),
      c("hovered", 110, 105, { degree: 0, priority: LABEL_PRIORITY.hovered }),
    ]);
    expect(result).toEqual(["hovered"]);
  });

  it("stops at the cap for normal labels", () => {
    const many = Array.from({ length: 10 }, (_, i) => c(`n${i}`, 50 + i * 90, 100, { degree: 10 - i }));
    expect(run(many, 3)).toEqual(["n0", "n1", "n2"]);
  });

  it("lets emphasised labels exceed the cap, but not overlap each other", () => {
    const emphasised = [0, 1, 2, 3].map((i) => c(`e${i}`, 50 + i * 90, 300, { priority: LABEL_PRIORITY.emphasised }));
    const clash = c("clash", 50, 305, { priority: LABEL_PRIORITY.emphasised, degree: 0 });
    const result = run([...emphasised, clash, c("normal", 400, 100)], 1);
    expect(result).toEqual(["e0", "e1", "e2", "e3", "normal"]);
  });

  it("skips labels entirely outside the viewport but keeps partially visible ones", () => {
    const result = run([
      c("left", -200, 100), c("right", 1000, 100), c("above", 100, -50), c("edge", 20, 100, { width: 80 }),
    ]);
    expect(result).toEqual(["edge"]);
  });

  it("returns nothing for no candidates", () => {
    expect(run([])).toEqual([]);
  });

  it("does not depend on the input order", () => {
    const list = [c("b", 100, 100), c("a", 105, 100), c("c", 400, 400)];
    expect(run(list)).toEqual(run([...list].reverse()));
  });
});

describe("label helpers", () => {
  it("estimates a one-line label rectangle from the text length", () => {
    const { width, height } = estimateLabelSize("abcd", 10);
    expect(width).toBeCloseTo(22);
    expect(height).toBeCloseTo(13);
    expect(estimateLabelSize("", 10).width).toBe(0);
  });

  it("steps toward a target without overshooting", () => {
    expect(stepToward(0, 1, 0.25)).toBe(0.25);
    expect(stepToward(0.9, 1, 0.25)).toBe(1);
    expect(stepToward(1, 0, 0.4)).toBe(0.6);
  });

  it("detects a size change beyond the tolerance", () => {
    expect(changedBeyond(10, 10.4, 0.05)).toBe(false);
    expect(changedBeyond(10, 11, 0.05)).toBe(true);
    expect(changedBeyond(0, 1, 0.05)).toBe(true);
  });
});
