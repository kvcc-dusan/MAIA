import { describe, it, expect } from "vitest";
import { attentionTasks } from "./attention.js";

const TODAY = "2026-10-09";
const t = (id, patch) => ({ id, title: id, status: "todo", ...patch });

const tasks = [
  t("fine", { due: "2026-10-20" }),
  t("late-new", { due: "2026-10-07" }),
  t("late-old", { due: "2026-10-01" }),
  t("stuck-dated", { status: "blocked", due: "2026-10-15" }),
  t("stuck-undated", { status: "blocked" }),
  t("stuck-and-late", { status: "blocked", due: "2026-10-05" }),
  t("done-late", { status: "done", due: "2026-09-01" }),
];

describe("attentionTasks", () => {
  const { items, total } = attentionTasks(tasks, TODAY, 10);

  it("puts overdue first by oldest due, then blocked by due with undated last", () => {
    expect(items.map((i) => i.id)).toEqual(["late-old", "stuck-and-late", "late-new", "stuck-dated", "stuck-undated"]);
    expect(total).toBe(5);
  });

  it("ignores done and on-time tasks", () => {
    expect(items.some((i) => i.id === "done-late" || i.id === "fine")).toBe(false);
  });

  it("flags overdue and blocked separately and counts days late", () => {
    const both = items.find((i) => i.id === "stuck-and-late");
    expect(both).toMatchObject({ isOverdue: true, isBlocked: true, daysLate: 4 });
    expect(items.find((i) => i.id === "stuck-dated")).toMatchObject({ isOverdue: false, isBlocked: true, daysLate: 0 });
  });

  it("caps the list at five but still reports the total", () => {
    const many = Array.from({ length: 8 }, (_, i) => t(`m${i}`, { due: "2026-10-01" }));
    const result = attentionTasks(many, TODAY);
    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(8);
  });

  it("is empty when nothing is wrong", () => {
    expect(attentionTasks([t("a")], TODAY)).toEqual({ items: [], total: 0 });
  });
});
