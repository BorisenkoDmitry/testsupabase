// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  installChunkRecovery,
  isChunkLoadError,
} from "@/shared/lib/chunk-recovery";

afterEach(() => vi.useRealTimers());
function browser() {
  const events = new EventTarget();
  const values = new Map<string, string>();
  const target = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    navigator: { onLine: true },
    sessionStorage: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
    },
    location: { reload: vi.fn() },
  };
  const fail = () => {
    const event = new Event("vite:preloadError", { cancelable: true });
    events.dispatchEvent(event);
    return event;
  };
  return { target, fail };
}
it("reloads once for a failed chunk and prevents reload loops across page loads", () => {
  const { target, fail } = browser();
  const dispose = installChunkRecovery(target);
  expect(fail().defaultPrevented).toBe(true);
  expect(target.location.reload).toHaveBeenCalledTimes(1);
  dispose();
  const disposeAgain = installChunkRecovery(target);
  expect(fail().defaultPrevented).toBe(false);
  expect(target.location.reload).toHaveBeenCalledTimes(1);
  disposeAgain();
});
it("allows recovery for a later deployment after the cooldown", () => {
  vi.useFakeTimers();
  const { target, fail } = browser();
  const dispose = installChunkRecovery(target);
  fail();
  vi.advanceTimersByTime(60_000);
  fail();
  expect(target.location.reload).toHaveBeenCalledTimes(2);
  dispose();
});
it("keeps the retry screen while offline", () => {
  const { target, fail } = browser();
  target.navigator.onLine = false;
  const dispose = installChunkRecovery(target);
  expect(fail().defaultPrevented).toBe(false);
  expect(target.location.reload).not.toHaveBeenCalled();
  dispose();
});
it("does not reload when storage is unavailable", () => {
  const { target, fail } = browser();
  target.sessionStorage.setItem.mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  const dispose = installChunkRecovery(target);
  expect(fail().defaultPrevented).toBe(false);
  expect(target.location.reload).not.toHaveBeenCalled();
  dispose();
});
it("can remove the recovery handler", () => {
  const { target, fail } = browser();
  installChunkRecovery(target)();
  fail();
  expect(target.location.reload).not.toHaveBeenCalled();
});
it.each([
  "Failed to fetch dynamically imported module: /assets/old.js",
  "Importing a module script failed.",
  "error loading dynamically imported module",
  "Unable to preload CSS for /assets/old.css",
])("recognizes chunk errors: %s", (message) => {
  expect(isChunkLoadError(new TypeError(message))).toBe(true);
});
it("does not treat API or ordinary rendering errors as chunk failures", () => {
  expect(isChunkLoadError(new Error("Failed to fetch"))).toBe(false);
  expect(isChunkLoadError(new Error("Access denied"))).toBe(false);
  expect(isChunkLoadError(null)).toBe(false);
});
