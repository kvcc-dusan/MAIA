import { describe, it, expect } from "vitest";
import { ORDER_STEP, compareTasks, insertIndex, planOrder, sortColumn } from "./order.js";

const t = (id, order = null, createdAt = `2026-01-${String(id.charCodeAt(0) - 96).padStart(2, "0")}`) => ({ id, order, createdAt });

const apply = (tasks, patches) => tasks.map((x) => {
  const p = patches.find((q) => q.id === x.id);
  return p ? { ...x, order: p.order } : x;
});

describe("sortColumn", () => {
  it("orders by order, nulls last, then createdAt, then id", () => {
    const list = [t("c"), t("b", 5), t("a"), t("d", 1)];
    expect(sortColumn(list).map((x) => x.id)).toEqual(["d", "b", "a", "c"]);
  });
  it("does not mutate its input", () => {
    const list = [t("b", 2), t("a", 1)];
    sortColumn(list);
    expect(list[0].id).toBe("b");
  });
  it("breaks full ties by id", () => {
    const a = { id: "x", order: null, createdAt: "" };
    const b = { id: "y", order: null, createdAt: "" };
    expect(compareTasks(a, b)).toBe(-1);
  });
});

describe("insertIndex", () => {
  const rest = [t("a", 1), t("b", 2), t("c", 3)];
  it("goes before the next neighbour", () => expect(insertIndex(rest, { nextId: "b" })).toBe(1));
  it("goes after the previous neighbour", () => expect(insertIndex(rest, { prevId: "c" })).toBe(3));
  it("falls back to the end", () => expect(insertIndex(rest, {})).toBe(3));
  it("ignores unknown ids", () => expect(insertIndex(rest, { nextId: "zz", prevId: "a" })).toBe(1));
});

describe("planOrder", () => {
  it("numbers the first task of an empty column", () => {
    expect(planOrder([], "m", 0)).toEqual([{ id: "m", order: ORDER_STEP }]);
  });
  it("uses the midpoint between numbered neighbours and writes one task", () => {
    expect(planOrder([t("a", 1000), t("b", 2000)], "m", 1)).toEqual([{ id: "m", order: 1500 }]);
  });
  it("goes below the first and above the last", () => {
    const rest = [t("a", 1000), t("b", 2000)];
    expect(planOrder(rest, "m", 0)).toEqual([{ id: "m", order: 0 }]);
    expect(planOrder(rest, "m", 2)).toEqual([{ id: "m", order: 3000 }]);
  });
  it("renumbers only when neighbours have no room", () => {
    const rest = [t("a", 1), t("b", 1), t("c", 5000)];
    const plan = planOrder(rest, "m", 1);
    expect(plan[0]).toEqual({ id: "m", order: 2000 });
    expect(plan.map((p) => p.id).sort()).toEqual(["a", "b", "c", "m"]);
  });
  it("numbers a never-ordered prefix and leaves the tail alone", () => {
    const rest = [t("a"), t("b"), t("c")];
    const plan = planOrder(rest, "m", 2);
    expect(plan.map((p) => p.id)).toEqual(["m", "a", "b"]);
  });
  it("keeps every result consistent with the intended sequence", () => {
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let run = 0; run < 200; run += 1) {
      const n = 1 + Math.floor(rand() * 7);
      let column = Array.from({ length: n }, (_, i) => t(String.fromCharCode(97 + i), rand() < 0.5 ? null : Math.floor(rand() * 4) * 1000));
      column = sortColumn(column);
      const moved = column[Math.floor(rand() * n)];
      const rest = column.filter((x) => x.id !== moved.id);
      const at = Math.floor(rand() * (rest.length + 1));
      const expected = [...rest.slice(0, at), moved, ...rest.slice(at)].map((x) => x.id);
      const after = sortColumn(apply(column, planOrder(rest, moved.id, at)));
      expect(after.map((x) => x.id)).toEqual(expected);
    }
  });
});
