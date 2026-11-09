import { useCallback, useEffect, useState } from "react";

/** Wall-clock sampling only. Deadline, freeze and timeout policies belong to callers. */
export function useClock(running = true, interval = 100) {
  const [now, setNow] = useState(Date.now);
  const refresh = useCallback(() => setNow(Date.now()), []);
  useEffect(() => {
    if (!running) return;
    refresh();
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [running, interval, refresh]);
  return { now, refresh };
}
