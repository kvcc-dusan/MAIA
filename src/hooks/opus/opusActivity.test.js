import { describe, it, expect } from "vitest";
import { routeOf, groupActivity, dirtyGroups, mergeActivity } from "./opusActivity.js";

const e = (n, projectId = "p1") => ({ at: `2026-10-01T00:00:${String(n).padStart(2, "0")}.000Z`, kind: "updated", collection: "tasks", itemId: `t${n}`, projectId, title: "x", from: null, to: null });
const known = new Set(["p1", "p2"]);

describe("activity routing", () => {
  it("sends unknown or missing projects to the inbox (null)", () => {
    expect(routeOf(e(1), known)).toBe("p1");
    expect(routeOf(e(1, "gone"), known)).toBeNull();
    expect(routeOf(e(1, null), known)).toBeNull();
  });

  it("groups per file and caps each file separately", () => {
    const groups = groupActivity([e(1), e(2, "p2"), e(3), e(4, null)], known, 1);
    expect(groups.get("p1").map((x) => x.itemId)).toEqual(["t3"]);
    expect(groups.get("p2")).toHaveLength(1);
    expect(groups.get(null)).toHaveLength(1);
  });

  it("marks only changed files dirty, including emptied ones", () => {
    const disk = new Map([["p1", [e(1)]], ["p2", [e(2, "p2")]]]);
    expect(dirtyGroups([e(1), e(2, "p2")], known, disk)).toEqual([]);
    const dirty = dirtyGroups([e(1), e(3)], known, disk);
    expect(dirty.map((d) => d.projectId).sort()).toEqual(["p1", "p2"]);
    expect(dirty.find((d) => d.projectId === "p2").entries).toEqual([]);
  });
});

describe("mergeActivity", () => {
  it("keeps an external append and a local pending entry", () => {
    const merged = mergeActivity([e(1)], [e(1), e(3)], [e(1), e(2)]);
    expect(merged.map((x) => x.itemId)).toEqual(["t1", "t2", "t3"]);
  });

  it("applies local removals (collapse, project delete) on top of disk", () => {
    const merged = mergeActivity([e(1), e(2)], [e(2)], [e(1), e(2), e(4)]);
    expect(merged.map((x) => x.itemId)).toEqual(["t2", "t4"]);
  });

  it("does not duplicate an entry that is both local-new and already on disk", () => {
    expect(mergeActivity([], [e(1)], [e(1)])).toHaveLength(1);
  });
});
