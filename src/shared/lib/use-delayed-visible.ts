import { useEffect, useState } from "react";

export const LOADING_DELAY = 300;

export function useDelayedVisible(active: boolean, delay = LOADING_DELAY) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);
  // Completion never waits for a timer; only the indicator's appearance is delayed.
  return active && visible;
}
