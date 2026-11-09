import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { adminFeedback } from "~/features/admin/AdminFeedback";
import { type GameCatalog, requestGameCatalog } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import { useGameCatalogDraft } from "./useGameCatalogDraft";

vi.mock("~/features/game/catalog", async (original) => ({
  ...(await original<typeof import("~/features/game/catalog")>()),
  requestGameCatalog: vi.fn(),
}));
beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(requestGameCatalog).mockReset();
});

it("loads a private draft, saves once while pending, and clears the saved marker after editing", async () => {
  vi.mocked(requestGameCatalog).mockResolvedValueOnce(sampleCatalog);
  const success = vi
    .spyOn(adminFeedback, "success")
    .mockReturnValue("保存しました");
  const { result } = renderHook(() => useGameCatalogDraft());
  await waitFor(() => expect(result.current.catalog).toBe(sampleCatalog));
  let resolve!: (value: GameCatalog) => void;
  vi.mocked(requestGameCatalog).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  let pending!: Promise<boolean>;
  act(() => {
    pending = result.current.save();
  });
  await act(async () => {
    expect(await result.current.save()).toBe(false);
  });
  expect(requestGameCatalog).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolve(sampleCatalog);
    expect(await pending).toBe(true);
  });
  expect(success).toHaveBeenCalledOnce();
  expect(result.current.saved).toBe(true);
  act(() =>
    result.current.setCatalog((value) =>
      value ? { ...value, elements: [] } : value,
    ),
  );
  expect(result.current.saved).toBe(false);
});

it("retains edits after failed saves and reports an error without a success toast", async () => {
  vi.mocked(requestGameCatalog)
    .mockResolvedValueOnce(sampleCatalog)
    .mockRejectedValueOnce(new Error("failed"));
  const error = vi.spyOn(adminFeedback, "error").mockReturnValue("failed");
  const success = vi.spyOn(adminFeedback, "success");
  const { result } = renderHook(() => useGameCatalogDraft());
  await waitFor(() => expect(result.current.catalog).toBe(sampleCatalog));
  const edited = { ...sampleCatalog, elements: [] };
  act(() => result.current.setCatalog(edited));
  await act(async () => {
    expect(await result.current.save()).toBe(false);
  });
  expect(result.current.catalog).toBe(edited);
  expect(result.current.error).toBe("failed");
  expect(result.current.saving).toBe(false);
  expect(error).toHaveBeenCalledOnce();
  expect(success).not.toHaveBeenCalled();
});

it("ignores a stale load after changing editor scope", async () => {
  let resolve!: (value: GameCatalog) => void;
  vi.mocked(requestGameCatalog)
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce(sampleCatalog);
  const first = (value: GameCatalog) => value;
  const second = (value: GameCatalog) => ({ ...value, elements: [] });
  const { result, rerender } = renderHook(
    ({ normalize }) => useGameCatalogDraft(normalize),
    { initialProps: { normalize: first } },
  );
  rerender({ normalize: second });
  await waitFor(() => expect(result.current.catalog?.elements).toEqual([]));
  await act(async () => resolve({ ...sampleCatalog, skills: [] }));
  expect(result.current.catalog?.skills).toEqual(sampleCatalog.skills);
});
