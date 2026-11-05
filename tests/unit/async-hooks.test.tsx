// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "@/shared/lib/use-debounce";
import { useDelayedVisible } from "@/shared/lib/use-delayed-visible";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useDebounce", () => {
  it("keeps the previous result until typing pauses for 300 ms", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "" },
    });
    rerender({ value: "г" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "горизонт" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("горизонт");
  });
  it("cancels pending updates on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "" } },
    );
    rerender({ value: "запрос" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe("useDelayedVisible", () => {
  it("never shows an indicator for a fast request", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedVisible(active),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(180));
    expect(result.current).toBe(false);
    rerender({ active: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });
  it("shows after 300 ms, hides immediately on completion, and resets for the next request", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedVisible(active),
      { initialProps: { active: true } },
    );
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);
  });
});
