import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { gameRequest } from "./battle";
import { type GameSave, enterDungeon, newSave } from "./domain";
import { type GameState, requestGameState } from "./state";
import { readGameSave } from "./storage";
import { useAdventureState } from "./useAdventureState";

vi.mock("./state", () => ({ requestGameState: vi.fn() }));
vi.mock("./storage", () => ({ readGameSave: vi.fn() }));
vi.mock("./battle", async (original) => ({
  ...(await original<typeof import("./battle")>()),
  gameRequest: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const snapshot = (revision = 1, save = newSave()): GameState => ({
  revision,
  save,
});
beforeEach(() => {
  vi.mocked(requestGameState).mockReset();
  vi.mocked(gameRequest).mockReset();
  vi.mocked(readGameSave).mockReset().mockReturnValue(newSave());
});

it("exposes an initial load error and retries on focus", async () => {
  vi.mocked(requestGameState).mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.stateLoaded).toBe(false);
  expect(result.current.error).toBe("offline");
  vi.mocked(requestGameState).mockResolvedValueOnce(snapshot(2));
  act(() => window.dispatchEvent(new Event("focus")));
  await waitFor(() => expect(result.current.stateLoaded).toBe(true));
  expect(result.current.revision.current).toBe(2);
});

it("retains a scheduled battle and does not reload during combat or pending commands", async () => {
  const save: GameSave = {
    ...newSave(),
    battle: {
      id: "battle",
      turn: 1,
      region: 1,
      checkpoint: "entry",
      enemies: [],
      schedule: {
        formula: "sqrt",
        actor_id: "player",
        quiz_enemy_id: null,
        enemy_hp: {},
        queue: [],
      },
    },
    battleFeedback: "再開",
  };
  vi.mocked(requestGameState).mockResolvedValueOnce(snapshot(4, save));
  const { result } = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.localBattle.current).toBe("battle");
  expect(result.current.feedback).toBe("再開");
  expect(gameRequest).not.toHaveBeenCalled();
  act(() => window.dispatchEvent(new Event("focus")));
  result.current.localBattle.current = null;
  result.current.pendingMove.current = true;
  act(() => window.dispatchEvent(new Event("focus")));
  result.current.pendingMove.current = false;
  result.current.answerRequestPending.current = true;
  act(() => window.dispatchEvent(new Event("focus")));
  expect(requestGameState).toHaveBeenCalledTimes(1);
});

it("abandons a legacy battle but resumes a cleared run through a revisioned write", async () => {
  const entered = enterDungeon(newSave(), "book", "本", 1);
  if (!entered.run) throw new Error("Missing run");
  vi.mocked(requestGameState).mockResolvedValueOnce(
    snapshot(2, {
      ...entered,
      run: { ...entered.run, phase: "battle" },
    }),
  );
  vi.mocked(gameRequest).mockResolvedValueOnce(snapshot(3, entered));
  const first = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  expect(gameRequest).toHaveBeenCalledWith("battle/abandon", {}, "POST");
  expect(first.result.current.revision.current).toBe(3);
  first.unmount();
  vi.mocked(requestGameState)
    .mockResolvedValueOnce(
      snapshot(4, { ...entered, run: { ...entered.run, phase: "cleared" } }),
    )
    .mockResolvedValueOnce(snapshot(5, entered));
  const second = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(second.result.current.ready).toBe(true));
  expect(requestGameState).toHaveBeenLastCalledWith({
    revision: 4,
    save: entered,
  });
  expect(second.result.current.revision.current).toBe(5);
});

it("ignores a focus response overtaken by a persisted or externally applied snapshot", async () => {
  vi.mocked(requestGameState).mockResolvedValueOnce(snapshot());
  const { result } = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  const read = deferred<GameState>();
  vi.mocked(requestGameState)
    .mockReturnValueOnce(read.promise)
    .mockResolvedValueOnce(snapshot(3));
  act(() => window.dispatchEvent(new Event("focus")));
  await act(async () => {
    await result.current.persist(newSave(), true);
  });
  await act(async () => read.resolve(snapshot(2)));
  expect(result.current.revision.current).toBe(3);
  expect(requestGameState).toHaveBeenLastCalledWith({
    revision: 1,
    save: newSave(),
    consume_access: true,
  });
  const secondRead = deferred<GameState>();
  vi.mocked(requestGameState).mockReturnValueOnce(secondRead.promise);
  act(() => window.dispatchEvent(new Event("focus")));
  act(() => result.current.applyState(snapshot(5)));
  await act(async () => secondRead.resolve(snapshot(4)));
  expect(result.current.revision.current).toBe(5);
});

it("reads back after a failed write without retrying it or hiding its original error", async () => {
  const cause = new Error("write failed");
  vi.mocked(requestGameState).mockResolvedValueOnce(snapshot());
  const { result } = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(result.current.ready).toBe(true));
  vi.mocked(requestGameState)
    .mockRejectedValueOnce(cause)
    .mockResolvedValueOnce(snapshot(7));
  await act(async () => {
    await expect(result.current.persist(newSave())).rejects.toBe(cause);
  });
  expect(result.current.revision.current).toBe(7);
  expect(requestGameState).toHaveBeenCalledTimes(3);
  expect(requestGameState).toHaveBeenLastCalledWith();
  vi.mocked(requestGameState)
    .mockRejectedValueOnce(cause)
    .mockRejectedValueOnce(new Error("read failed"));
  await act(async () => {
    await expect(result.current.persist(newSave())).rejects.toBe(cause);
  });
});

it("offers the local legacy save only for an empty server and ignores responses after unmount", async () => {
  const legacy = enterDungeon(newSave(), "book", "本", 1);
  vi.mocked(readGameSave).mockReturnValue(legacy);
  vi.mocked(requestGameState).mockResolvedValueOnce(snapshot(0));
  const { result, unmount } = renderHook(() => useAdventureState("user"));
  await waitFor(() => expect(result.current.legacy).toBe(legacy));
  expect(readGameSave).toHaveBeenCalledWith("user");
  const read = deferred<GameState>();
  vi.mocked(requestGameState).mockReturnValueOnce(read.promise);
  act(() => window.dispatchEvent(new Event("focus")));
  unmount();
  await act(async () => read.resolve(snapshot(4)));
  expect(result.current.revision.current).toBe(0);
  act(() => window.dispatchEvent(new Event("focus")));
  expect(requestGameState).toHaveBeenCalledTimes(2);
});
