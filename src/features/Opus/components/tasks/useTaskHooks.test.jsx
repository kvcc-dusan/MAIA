// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGroupOpen } from "./useGroupOpen.js";
import { useTaskFilters } from "./useTaskFilters.js";

describe("useTaskFilters", () => {
  it("starts from the navigation params", () => {
    const params = { status: "blocked", ws: "w1" };
    const { result } = renderHook(() => useTaskFilters(params));
    expect(result.current[0]).toMatchObject({ statuses: ["blocked"], workstreamId: "w1" });
  });

  it("re-applies when a new params object arrives, and not when the same one re-renders", () => {
    const first = { status: "blocked" };
    const { result, rerender } = renderHook(({ params }) => useTaskFilters(params), { initialProps: { params: first } });

    act(() => result.current[1]({ type: "query", value: "login" }));
    rerender({ params: first });
    expect(result.current[0].query).toBe("login");

    rerender({ params: { status: "overdue" } });
    expect(result.current[0]).toMatchObject({ statuses: ["overdue"], query: "" });
  });

  it("keeps the grouping across a params change", () => {
    const { result, rerender } = renderHook(({ params }) => useTaskFilters(params), { initialProps: { params: {} } });
    act(() => result.current[1]({ type: "groupBy", value: "workstream" }));
    rerender({ params: { status: "todo" } });
    expect(result.current[0].groupBy).toBe("workstream");
  });
});

describe("useGroupOpen", () => {
  const group = (key, defaultOpen) => ({ key, defaultOpen });
  const view = { groupBy: "status", isFiltered: false };

  it("follows the defaults until toggled", () => {
    const groups = [group("today", true), group("future", false)];
    const { result } = renderHook(() => useGroupOpen(groups, view));
    expect(result.current.isOpen(groups[0])).toBe(true);
    expect(result.current.isOpen(groups[1])).toBe(false);
    act(() => result.current.toggle(groups[1]));
    expect(result.current.isOpen(groups[1])).toBe(true);
    act(() => result.current.toggle(groups[0]));
    expect(result.current.isOpen(groups[0])).toBe(false);
  });

  it("opens a group that newly appears in a steady view", () => {
    const today = group("today", true);
    const future = group("future", false);
    const { result, rerender } = renderHook(({ groups }) => useGroupOpen(groups, view), { initialProps: { groups: [today] } });
    rerender({ groups: [today, future] });
    expect(result.current.isOpen(future)).toBe(true);
  });

  it("does not open appearing groups while filtering or after a grouping change", () => {
    const today = group("today", true);
    const future = group("future", false);

    const filtered = renderHook(({ groups, isFiltered }) => useGroupOpen(groups, { groupBy: "status", isFiltered }), {
      initialProps: { groups: [today], isFiltered: false },
    });
    filtered.rerender({ groups: [today, future], isFiltered: true });
    expect(filtered.result.current.isOpen(future)).toBe(false);

    const regrouped = renderHook(({ groups, groupBy }) => useGroupOpen(groups, { groupBy, isFiltered: false }), {
      initialProps: { groups: [today], groupBy: "workstream" },
    });
    regrouped.rerender({ groups: [today, future], groupBy: "status" });
    expect(regrouped.result.current.isOpen(future)).toBe(false);
  });
});
