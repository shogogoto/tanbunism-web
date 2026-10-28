import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import GameSettingsFiles from "./GameSettingsFiles";
import * as files from "./gameSettingsFiles";

const before: files.GameSettingsDocument = {
  format: "tanbunism.game-settings",
  version: 1,
  catalog: { skills: [], items: [], enemies: [] },
  balance: { base_hp: 35 },
  battle: { base_seconds: 30 },
};
const after: files.GameSettingsDocument = {
  ...before,
  balance: { base_hp: 70 },
};
const preview: files.GameSettingsPreview = {
  revision: "revision-1",
  backup: before,
  document: after,
  changes: [{ section: "balance.base_hp", before: 35, after: 70 }],
};
const saves = vi.fn();
const previews = vi.fn();
const server = setupServer(
  http.get("*/admin/game/settings-file", () => HttpResponse.json(before)),
  http.post("*/admin/game/settings-file/preview", async ({ request }) => {
    previews(await request.json());
    return HttpResponse.json(preview);
  }),
  http.put("*/admin/game/settings-file", async ({ request }) => {
    saves(await request.json());
    return HttpResponse.json(after);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  saves.mockClear();
  previews.mockClear();
});
const upload = async (
  user: ReturnType<typeof userEvent.setup>,
  document: unknown = after,
) =>
  user.upload(
    screen.getByLabelText("ゲーム設定JSONファイル"),
    new File([JSON.stringify(document)], "game.json", {
      type: "application/json",
    }),
  );

it("exports all persisted sections through the common entry point", async () => {
  const download = vi
    .spyOn(files, "downloadGameSettings")
    .mockImplementation(() => undefined);
  render(<GameSettingsFiles onApplied={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "JSONを書き出す" }));
  await waitFor(() => expect(download).toHaveBeenCalledWith(before));
  expect(saves).not.toHaveBeenCalled();
  expect(screen.getByText(/未保存の編集内容やプレイヤー/)).toBeVisible();
});

it("shows differences without saving, then backs up before explicit atomic apply", async () => {
  const applied = vi.fn();
  const download = vi
    .spyOn(files, "downloadGameSettings")
    .mockImplementation(() => {
      expect(saves).not.toHaveBeenCalled();
    });
  render(<GameSettingsFiles onApplied={applied} />);
  const user = userEvent.setup();
  await upload(user);
  const dialog = within(
    await screen.findByRole("dialog", { name: "ゲーム設定の取り込み確認" }),
  );
  await user.click(dialog.getByText("ゲームバランス：base_hp"));
  expect(dialog.getByText("35")).toBeVisible();
  expect(dialog.getByText("70")).toBeVisible();
  expect(saves).not.toHaveBeenCalled();
  await user.click(
    dialog.getByRole("button", { name: "バックアップして反映" }),
  );
  await screen.findByText(/ゲーム設定を反映しました/);
  expect(download).toHaveBeenCalledWith(before, true);
  expect(saves).toHaveBeenCalledWith({
    document: after,
    revision: "revision-1",
  });
  expect(applied).toHaveBeenCalledOnce();
});

it("cancels without writes and accepts old skill files at the same endpoint", async () => {
  render(<GameSettingsFiles onApplied={vi.fn()} />);
  const user = userEvent.setup();
  const old = { format: "tanbunism.skills", version: 6, skills: [] };
  await upload(user, old);
  await screen.findByRole("dialog");
  expect(previews).toHaveBeenCalledWith({ document: old });
  await user.click(screen.getByRole("button", { name: "キャンセル" }));
  expect(saves).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("retains the confirmation and reports conflicts without refreshing editors", async () => {
  server.use(
    http.put("*/admin/game/settings-file", () =>
      HttpResponse.json(
        { detail: "設定が変更されています。再度取り込んでください。" },
        { status: 409 },
      ),
    ),
  );
  vi.spyOn(files, "downloadGameSettings").mockImplementation(() => undefined);
  const applied = vi.fn();
  render(<GameSettingsFiles onApplied={applied} />);
  const user = userEvent.setup();
  await upload(user);
  await user.click(
    await screen.findByRole("button", { name: "バックアップして反映" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "設定が変更されています",
  );
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(applied).not.toHaveBeenCalled();
});

it("rejects invalid JSON before making a request and prevents no-op writes", async () => {
  render(<GameSettingsFiles onApplied={vi.fn()} />);
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("ゲーム設定JSONファイル"),
    new File(["{"], "bad.json", { type: "application/json" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("JSONの形式");
  expect(previews).not.toHaveBeenCalled();
  server.use(
    http.post("*/admin/game/settings-file/preview", () =>
      HttpResponse.json({ ...preview, changes: [] }),
    ),
  );
  await upload(user);
  await screen.findByText("変更はありません。");
  expect(
    screen.getByRole("button", { name: "バックアップして反映" }),
  ).toBeDisabled();
  expect(saves).not.toHaveBeenCalled();
});

it("rejects oversized files and reads a UTF-8 BOM", async () => {
  await expect(
    files.readGameSettingsFile(
      new File(
        [" ".repeat(files.MAX_GAME_SETTINGS_FILE_BYTES + 1)],
        "large.json",
      ),
    ),
  ).rejects.toThrow("5MB以下");
  await expect(
    files.readGameSettingsFile(
      new File([`\uFEFF${JSON.stringify(before)}`], "bom.json"),
    ),
  ).resolves.toEqual(before);
});
