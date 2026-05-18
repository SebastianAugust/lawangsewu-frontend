import { createContext, useCallback, useContext, useMemo, useState } from "react";

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  // tourId bumps every start() — consumers can use it as a React key to
  // force-remount and avoid stale state between tour runs.
  const [tourId, setTourId] = useState(0);

  const start = useCallback(() => {
    setStepIdx(0);
    setTourId((id) => id + 1);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setStepIdx(0);
  }, []);

  const next = useCallback(() => setStepIdx((i) => i + 1), []);
  const prev = useCallback(() => setStepIdx((i) => Math.max(0, i - 1)), []);
  const goTo = useCallback((i) => setStepIdx(i), []);

  const value = useMemo(
    () => ({ running, stepIdx, tourId, start, stop, next, prev, goTo }),
    [running, stepIdx, tourId, start, stop, next, prev, goTo],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside <TourProvider>");
  return ctx;
}
