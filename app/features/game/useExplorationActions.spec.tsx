import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { type GameSave, enterDungeon, newSave } from "./domain";
import { type GameState, requestGameState } from "./state";
import { openChest } from "./treasure";
import { useExplorationActions } from "./useExplorationActions";

vi.mock("./state", () => ({ requestGameState: vi.fn() }));
vi.mock("./treasure", () => ({ openChest: vi.fn() }));

const entered = () => enterDungeon(newSave(), "book", "本", 1);
const applyState = vi.fn();
const setError = vi.fn();
const update = vi.fn<(next: GameSave) => Promise<GameState>>();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requestGameState).mockReset();
  vi.mocked(openChest).mockReset();
  update
    .mockReset()
    .mockImplementation(async (save) => ({ revision: 5, save }));
});

function setup(save = entered(), stateLoaded = true) {
  return renderHook(() => {
    const [busy, setBusy] = useState(false);
    const pendingMove = useRef(false);
    const revision = useRef(4);
    const actions = useExplorationActions({
      adventure: {
        save,
        stateLoaded,
        pendingMove,
        revision,
        applyState,
        setError,
      },
      busy,
      setBusy,
      update,
    });
    return { ...actions, busy, setBusy, pendingMove };
  });
}

it("recovers HP and MP through the existing domain rule and saves exactly once", async () => {
  const base = entered();
  if (!base.run) throw new Error("Missing run");
  const damaged = { ...base, run: { ...base.run, hp: 1, mp: 0 } };
  const { result } = setup(damaged);
  await act(async () => {
    expect(await result.current.recoverAtSanctuary()).toBe(true);
  });
  expect(update).toHaveBeenCalledOnce();
  expect(update.mock.calls[0][0].run).toMatchObject({
    hp: base.run.maxHp,
    mp: base.run.maxMp,
    moves: 1,
  });
  expect(damaged.run).toMatchObject({ hp: 1, mp: 0, moves: 0 });
  expect(result.current.busy).toBe(false);
  expect(result.current.pendingMove.current).toBe(false);
});

it("does nothing when recovery is unnecessary or there is no adventure", async () => {
  const full = setup();
  await act(async () => {
    expect(await full.result.current.recoverAtSanctuary()).toBe(false);
  });
  full.unmount();
  const empty = setup(newSave());
  await act(async () => {
    expect(await empty.result.current.recoverAtSanctuary()).toBe(false);
  });
  expect(update).not.toHaveBeenCalled();
});

it("allows facilities before the first adventure without writing or consuming a move", async () => {
  const { result } = setup(newSave());
  await act(async () => {
    expect(await result.current.visitFacility()).toBe(true);
  });
  expect(update).not.toHaveBeenCalled();
  expect(setError).not.toHaveBeenCalled();
});

it("allows opening a facility only after its one-move visit was saved", async () => {
  let resolve!: (state: GameState) => void;
  update.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result } = setup();
  let pending!: Promise<boolean>;
  act(() => {
    pending = result.current.visitFacility();
  });
  expect(result.current.busy).toBe(true);
  await act(async () => {
    expect(await result.current.visitFacility()).toBe(false);
  });
  expect(update).toHaveBeenCalledOnce();
  expect(update.mock.calls[0][0].run?.moves).toBe(1);
  await act(async () => {
    resolve({ revision: 5, save: update.mock.calls[0][0] });
    expect(await pending).toBe(true);
  });
  expect(result.current.busy).toBe(false);
});

it("does not visit a facility while unloaded, away from the entrance, out of moves or showing battle feedback", async () => {
  const base = entered();
  if (!base.run) throw new Error("Missing run");
  const blocked: [GameSave, boolean][] = [
    [newSave(), false],
    [{ ...base, run: { ...base.run, moves: 5 } }, true],
    [{ ...base, run: { ...base.run, readIds: ["away"] } }, true],
    [{ ...base, battleFeedback: "結果" }, true],
    [{ ...base, run: { ...base.run, phase: "battle" } }, true],
  ];
  for (const [save, loaded] of blocked) {
    const { result, unmount } = setup(save, loaded);
    await act(async () => {
      expect(await result.current.visitFacility()).toBe(false);
    });
    unmount();
  }
  expect(update).not.toHaveBeenCalled();
});

it("keeps a facility closed on save failure and releases the command lock", async () => {
  update.mockRejectedValueOnce(new Error("offline"));
  const { result } = setup();
  await act(async () => {
    expect(await result.current.visitFacility()).toBe(false);
  });
  expect(setError).toHaveBeenLastCalledWith("offline");
  expect(result.current.busy).toBe(false);
  expect(result.current.pendingMove.current).toBe(false);
  await act(async () => {
    expect(await result.current.visitFacility()).toBe(true);
  });
  expect(update).toHaveBeenCalledTimes(2);
});

it("opens a chest with the current revision and applies its authoritative reward snapshot", async () => {
  const state = { revision: 5, save: entered() };
  vi.mocked(openChest).mockResolvedValueOnce(state);
  const { result } = setup();
  await act(async () => {
    expect(await result.current.visitChest(3)).toBe(true);
  });
  expect(openChest).toHaveBeenCalledWith(4, 3);
  expect(applyState).toHaveBeenCalledWith(state);
  expect(update).not.toHaveBeenCalled();
});

it("reads back after a chest failure without repeating the reward claim or hiding its error", async () => {
  vi.mocked(openChest).mockRejectedValueOnce(new Error("claim failed"));
  const state = { revision: 6, save: entered() };
  vi.mocked(requestGameState).mockResolvedValueOnce(state);
  const { result } = setup();
  await act(async () => {
    expect(await result.current.visitChest(2)).toBe(false);
  });
  expect(openChest).toHaveBeenCalledOnce();
  expect(requestGameState).toHaveBeenCalledOnce();
  expect(applyState).toHaveBeenCalledWith(state);
  expect(setError).toHaveBeenLastCalledWith("claim failed");
  vi.mocked(openChest).mockRejectedValueOnce("unknown failure");
  vi.mocked(requestGameState).mockRejectedValueOnce(new Error("read failed"));
  await act(async () => {
    expect(await result.current.visitChest(2)).toBe(false);
  });
  expect(setError).toHaveBeenLastCalledWith("宝箱を開けられませんでした。");
});

it("shares the pending lock across commands and does not apply a late response after unmount", async () => {
  let resolve!: (state: GameState) => void;
  vi.mocked(openChest).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result, unmount } = setup();
  let pending!: Promise<boolean>;
  act(() => {
    pending = result.current.visitChest(1);
  });
  await act(async () => {
    expect(await result.current.visitFacility()).toBe(false);
  });
  expect(update).not.toHaveBeenCalled();
  unmount();
  await act(async () => {
    resolve({ revision: 7, save: entered() });
    expect(await pending).toBe(false);
  });
  expect(applyState).not.toHaveBeenCalled();
  expect(result.current.pendingMove.current).toBe(false);
});
