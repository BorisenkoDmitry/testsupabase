const reloadKey = "crm:chunk-reload-at";
const reloadInterval = 60_000;
type RecoveryWindow = Pick<
  EventTarget,
  "addEventListener" | "removeEventListener"
> & {
  navigator: Pick<Navigator, "onLine">;
  sessionStorage: Pick<Storage, "getItem" | "setItem">;
  location: Pick<Location, "reload">;
};

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    message,
  );
}

export function installChunkRecovery(target: RecoveryWindow = window) {
  const recover = (event: Event) => {
    if (!target.navigator.onLine) return;
    try {
      const now = Date.now();
      const previous = Number(target.sessionStorage.getItem(reloadKey));
      if (previous > 0 && now - previous < reloadInterval) return;
      // Persist before reloading; a missing asset or network outage must not loop.
      target.sessionStorage.setItem(reloadKey, String(now));
      target.location.reload();
      event.preventDefault();
    } catch {
      // Without storage we cannot guarantee a bounded reload. Keep the retry UI.
    }
  };
  target.addEventListener("vite:preloadError", recover);
  return () => target.removeEventListener("vite:preloadError", recover);
}
