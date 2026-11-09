import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import {
  type GameSave,
  recoverAtEntrance,
  visitEntranceFacility,
} from "./domain";
import { type GameState, requestGameState } from "./state";
import { openChest } from "./treasure";
import type { useAdventureState } from "./useAdventureState";

type Context = {
  adventure: Pick<
    ReturnType<typeof useAdventureState>,
    | "save"
    | "revision"
    | "stateLoaded"
    | "pendingMove"
    | "applyState"
    | "setError"
  >;
  busy: boolean;
  setBusy: Dispatch<SetStateAction<boolean>>;
  update: (next: GameSave) => Promise<GameState>;
};

/** Entrance and treasure commands; navigation and dialogs belong to the caller. */
export function useExplorationActions({
  adventure,
  busy,
  setBusy,
  update,
}: Context) {
  const { save, revision, stateLoaded, pendingMove, applyState, setError } =
    adventure;
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  // Private lifecycle, not a configurable app-wide command framework.
  async function perform(
    action: () => Promise<void>,
    fallback: string,
  ): Promise<boolean> {
    if (!active.current || busy || pendingMove.current) return false;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await action();
      return active.current;
    } catch (cause) {
      if (active.current)
        setError(cause instanceof Error ? cause.message : fallback);
      return false;
    } finally {
      pendingMove.current = false;
      if (active.current) setBusy(false);
    }
  }

  function recoverAtSanctuary(): Promise<boolean> {
    if (!save.run) return Promise.resolve(false);
    const recovered = recoverAtEntrance(save);
    if (recovered === save) return Promise.resolve(false);
    return perform(async () => {
      await update(recovered);
    }, "回復場所へ移動できませんでした。");
  }

  function visitFacility(): Promise<boolean> {
    if (
      !active.current ||
      !stateLoaded ||
      busy ||
      pendingMove.current ||
      save.battleFeedback ||
      save.battle
    )
      return Promise.resolve(false);
    // Before the first adventure there is no move budget to consume.
    if (!save.run) return Promise.resolve(true);
    const visited = visitEntranceFacility(save);
    if (visited === save) return Promise.resolve(false);
    return perform(async () => {
      await update(visited);
    }, "施設へ移動できませんでした。");
  }

  function visitChest(region: number): Promise<boolean> {
    if (!save.run) return Promise.resolve(false);
    return perform(async () => {
      try {
        const state = await openChest(revision.current, region);
        if (active.current) applyState(state);
      } catch (cause) {
        // Opening may have committed. Read back, never repeat the reward claim.
        if (active.current) {
          const state = await requestGameState().catch(() => undefined);
          if (state && active.current) applyState(state);
        }
        throw cause;
      }
    }, "宝箱を開けられませんでした。");
  }

  return { recoverAtSanctuary, visitFacility, visitChest };
}
