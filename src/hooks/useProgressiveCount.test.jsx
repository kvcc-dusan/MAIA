// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useProgressiveCount } from "./useProgressiveCount.js";

afterEach(() => vi.useRealTimers());

// Each batch is scheduled by an effect after the previous render, so time has to pass one step at a time.
const settle = () => { for (let i = 0; i < 30; i += 1) act(() => { vi.advanceTimersByTime(20); }); };

describe("useProgressiveCount", () => {
  it("starts with a small batch and grows to the full length", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProgressiveCount(100, "a", { initial: 10, step: 30 }));
    expect(result.current).toBe(10);
    act(() => { vi.advanceTimersByTime(20); });
    expect(result.current).toBe(40);
    settle();
    expect(result.current).toBe(100);
  });

  it("never exceeds the total, even for short lists", () => {
    const { result } = renderHook(() => useProgressiveCount(5, "a", { initial: 10 }));
    expect(result.current).toBe(5);
  });

  it("restarts from the small batch when the reset key changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ key }) => useProgressiveCount(100, key, { initial: 10, step: 30 }), { initialProps: { key: "a" } });
    settle();
    expect(result.current).toBe(100);
    rerender({ key: "b" });
    expect(result.current).toBe(10);
  });
});
