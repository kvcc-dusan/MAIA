// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTaskFilters } from "./useTaskFilters.js";

describe("useTaskFilters", () => {
  it("starts from the navigation params", () => {
    const params = { status: "blocked", ws: "w1" };
    const { result } = renderHook(() => useTaskFilters(params));
    expect(result.current[0]).toMatchObject({ status: "blocked", workstreamId: "w1" });
  });

  it("re-applies when a new params object arrives, and not when the same one re-renders", () => {
    const first = { status: "blocked" };
    const { result, rerender } = renderHook(({ params }) => useTaskFilters(params), { initialProps: { params: first } });

    act(() => result.current[1]({ type: "query", value: "login" }));
    rerender({ params: first });
    expect(result.current[0].query).toBe("login");

    rerender({ params: { status: "overdue" } });
    expect(result.current[0]).toMatchObject({ status: "overdue", query: "" });
  });

  it("keeps the grouping across a params change", () => {
    const { result, rerender } = renderHook(({ params }) => useTaskFilters(params), { initialProps: { params: {} } });
    act(() => result.current[1]({ type: "groupBy", value: "milestone" }));
    rerender({ params: { status: "todo" } });
    expect(result.current[0].groupBy).toBe("milestone");
  });
});
