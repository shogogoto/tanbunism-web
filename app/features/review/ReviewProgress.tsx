import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Kind = "knowledge" | "quiz";
type Progress = { done: number; total: number };
const Context = createContext<{
  values: Record<string, Progress>;
  publish: (key: string, progress: Progress) => void;
}>({ values: {}, publish: () => undefined });
const keyFor = (kind: Kind, profile: string, day: string) =>
  JSON.stringify([kind, profile, day]);

/** Progress is derived from loaded sets, scoped to the current signed-in user. */
export function ReviewProgressProvider({ children }: PropsWithChildren) {
  const [values, setValues] = useState<Record<string, Progress>>({});
  const publish = useCallback((key: string, progress: Progress) => {
    setValues((current) => {
      if (
        current[key]?.done === progress.done &&
        current[key]?.total === progress.total
      )
        return current;
      return { ...current, [key]: progress };
    });
  }, []);
  return (
    <Context.Provider value={{ values, publish }}>{children}</Context.Provider>
  );
}

export function useReviewProgress(kind: Kind, profile: string, day: string) {
  return useContext(Context).values[keyFor(kind, profile, day)];
}

export function usePublishReviewProgress(
  kind: Kind,
  profile: string,
  day: string,
  done: number,
  total: number,
  ready: boolean,
) {
  const { publish } = useContext(Context);
  useEffect(() => {
    if (ready) publish(keyFor(kind, profile, day), { done, total });
  }, [kind, profile, day, done, total, ready, publish]);
}
