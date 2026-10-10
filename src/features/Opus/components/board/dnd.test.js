import { describe, it, expect } from "vitest";
import { applyMove, buildAnnouncements, nextKeyboardTarget, positionOf, resolveDrop, sameColumns } from "./dnd.js";

const cols = () => ({ todo: ["a", "b", "c"], doing: ["d"], blocked: [], done: ["e", "f"] });

describe("resolveDrop and applyMove", () => {
  it("reorders inside a column", () => {
    const drop = resolveDrop(cols(), "a", "c");
    expect(drop).toEqual({ status: "todo", index: 2 });
    expect(applyMove(cols(), "a", drop).todo).toEqual(["b", "c", "a"]);
  });
  it("moves across columns before the card under it", () => {
    const drop = resolveDrop(cols(), "a", "e");
    expect(applyMove(cols(), "a", drop).done).toEqual(["a", "e", "f"]);
    expect(applyMove(cols(), "a", drop).todo).toEqual(["b", "c"]);
  });
  it("goes after the card when the pointer is below it", () => {
    expect(applyMove(cols(), "a", resolveDrop(cols(), "a", "e", { isBelowOver: true })).done).toEqual(["e", "a", "f"]);
  });
  it("fills an empty column", () => {
    expect(applyMove(cols(), "a", resolveDrop(cols(), "a", "blocked")).blocked).toEqual(["a"]);
  });
  it("does not mutate", () => {
    const c = cols();
    applyMove(c, "a", { status: "done", index: 0 });
    expect(c).toEqual(cols());
  });
  it("returns null for unknown ids", () => expect(resolveDrop(cols(), "zz", "a")).toBeNull());
  it("compares arrangements", () => expect(sameColumns(cols(), cols())).toBe(true));
});

describe("nextKeyboardTarget", () => {
  it("moves within a column", () => {
    expect(nextKeyboardTarget(cols(), "b", "ArrowUp")).toEqual({ type: "item", id: "a" });
    expect(nextKeyboardTarget(cols(), "b", "ArrowDown")).toEqual({ type: "item", id: "c" });
    expect(nextKeyboardTarget(cols(), "a", "ArrowUp")).toBeNull();
  });
  it("moves between columns at the same index, clamped to the end", () => {
    expect(nextKeyboardTarget(cols(), "b", "ArrowRight")).toEqual({ type: "end", status: "doing", lastId: "d" });
    expect(nextKeyboardTarget(cols(), "a", "ArrowRight")).toEqual({ type: "item", id: "d" });
    expect(nextKeyboardTarget(cols(), "d", "ArrowRight")).toEqual({ type: "column", status: "blocked" });
    expect(nextKeyboardTarget(cols(), "a", "ArrowLeft")).toBeNull();
  });
});

describe("announcements", () => {
  const a = buildAnnouncements({
    titleOf: (id) => `Task ${id}`,
    originOf: () => ({ status: "todo", position: 1, total: 3 }),
    destinationOf: () => ({ status: "done", position: 2, total: 3 }),
  });
  it("describes every step in plain sentences", () => {
    expect(a.onDragStart({ active: { id: "a" } })).toContain("Picked up Task a. To do, position 1 of 3.");
    expect(a.onDragOver({ active: { id: "a" }, over: {} })).toBe("Task a is over Done, position 2 of 3.");
    expect(a.onDragEnd({ active: { id: "a" }, over: null })).toContain("Nothing changed");
    expect(a.onDragCancel({ active: { id: "a" } })).toContain("back in To do");
  });
  it("positionOf", () => expect(positionOf(cols(), "c")).toEqual({ status: "todo", position: 3, total: 3 }));
});
