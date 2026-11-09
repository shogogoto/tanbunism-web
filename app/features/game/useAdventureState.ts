import { useCallback, useEffect, useRef, useState } from "react";
import type { DungeonContent } from "./api";
import { gameRequest } from "./battle";
import { type GameSave, continueExploring, newSave } from "./domain";
import { type GameState, requestGameState } from "./state";
import { readGameSave } from "./storage";

/** Server snapshot ownership. Exploration commands and screen state stay with callers. */
export function useAdventureState(userId: string) {
  const [save, setSave] = useState<GameSave>(newSave);
  const [ready, setReady] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [legacy, setLegacy] = useState<GameSave>();
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const revision = useRef(0);
  const pendingMove = useRef(false);
  const answerRequestPending = useRef(false);
  const localBattle = useRef<string | null>(null);
  const epoch = useRef(0);
  const writes = useRef(0);
  const mounted = useRef(false);

  const applyState = useCallback((state: GameState) => {
    epoch.current++;
    revision.current = state.revision;
    setSave(state.save);
    setFeedback(state.save.battleFeedback ?? undefined);
  }, []);

  // GamePlay is keyed by userId: private snapshots never survive an account change.
  useEffect(() => {
    let active = true;
    mounted.current = true;
    const reload = async () => {
      if (
        pendingMove.current ||
        answerRequestPending.current ||
        localBattle.current ||
        writes.current > 0
      )
        return;
      const current = ++epoch.current;
      const isCurrent = () =>
        active &&
        current === epoch.current &&
        writes.current === 0 &&
        !pendingMove.current &&
        !answerRequestPending.current;
      try {
        let state = await requestGameState();
        if (!isCurrent()) return;
        if (!state.save.battle?.schedule) {
          if (state.save.battle || state.save.run?.phase === "battle") {
            state = await gameRequest<GameState>("battle/abandon", {}, "POST");
          } else {
            const continued = continueExploring(state.save);
            if (continued !== state.save)
              state = await requestGameState({
                revision: state.revision,
                save: continued,
              });
          }
        }
        if (!isCurrent()) return;
        if (state.save.battle?.schedule)
          localBattle.current = state.save.battle.id;
        applyState(state);
        setStateLoaded(true);
        if (!state.revision) {
          const old = readGameSave(userId);
          if (old.run || Object.keys(old.clears).length) setLegacy(old);
        } else setLegacy(undefined);
        setReady(true);
      } catch (cause) {
        if (!isCurrent()) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "冒険状態を取得できませんでした。",
        );
        setReady(true);
      }
    };
    void reload();
    window.addEventListener("focus", reload);
    return () => {
      active = false;
      mounted.current = false;
      epoch.current++;
      window.removeEventListener("focus", reload);
    };
  }, [userId, applyState]);

  const persist = useCallback(
    async (next: GameSave, consumeAccess = false, content?: DungeonContent) => {
      // Fence a focus reload that started before this command.
      const current = ++epoch.current;
      writes.current++;
      try {
        const continued = continueExploring(next);
        const state = await requestGameState({
          revision: revision.current,
          save: continued.run
            ? { ...continued, content: continued.content ?? content }
            : continued,
          consume_access: consumeAccess,
        });
        if (mounted.current && current === epoch.current) applyState(state);
        return state;
      } catch (cause) {
        // A failed write may have committed: read back, never repeat the write.
        if (mounted.current && current === epoch.current) {
          const latest = await requestGameState().catch(() => undefined);
          if (latest && mounted.current && current === epoch.current)
            applyState(latest);
        }
        throw cause;
      } finally {
        writes.current--;
      }
    },
    [applyState],
  );

  return {
    save,
    setSave,
    ready,
    stateLoaded,
    legacy,
    setLegacy,
    error,
    setError,
    feedback,
    revision,
    pendingMove,
    answerRequestPending,
    localBattle,
    applyState,
    persist,
  };
}
