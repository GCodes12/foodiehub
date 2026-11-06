import { useEffect, useRef } from 'react';

/** Calls `refresh` every `ms` while `enabled` and the tab is visible, and once when the tab becomes visible again. */
export function usePolling(refresh: () => void, ms: number, enabled: boolean): void {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const tick = () => {
      if (document.visibilityState === 'visible') {
        latest.current();
      }
    };
    const timer = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, enabled]);
}
