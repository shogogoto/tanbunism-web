import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import UserDataTransfer from "./UserDataTransfer";
import { previewUserTransfer, transferUserData } from "./api";

vi.mock("./api", () => ({
  previewUserTransfer: vi.fn(),
  transferUserData: vi.fn(),
}));
const source = {
  uid: "source",
  email: "aaa@a.com",
  display_name: null,
  username: null,
  is_active: true,
  is_superuser: true,
  created: "2026-10-08",
  resource_count: 42,
};
const target = {
  ...source,
  uid: "target",
  email: "google@example.com",
  is_superuser: false,
  resource_count: 0,
};
const preview = {
  source_id: source.uid,
  target_id: target.uid,
  source_email: source.email,
  target_email: target.email,
  counts: { Resource: 42, Answer: 5, TanbunExposure: 8, ResourceXpEvent: 10 },
  blockers: [],
  preview_token: "a".repeat(64),
};
beforeEach(() => {
  vi.mocked(previewUserTransfer).mockResolvedValue(preview);
  vi.mocked(transferUserData).mockResolvedValue(preview);
});

it("移行元を保持し、プレビューと両メール確認の後だけ移行できる", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onTransferred = vi.fn().mockResolvedValue(undefined);
  render(
    <UserDataTransfer
      source={source}
      users={[source, target]}
      onClose={onClose}
      onTransferred={onTransferred}
    />,
  );
  expect(screen.queryByRole("option", { name: source.email })).toBeNull();
  expect(screen.queryByRole("button", { name: "データを移行する" })).toBeNull();
  await user.selectOptions(screen.getByLabelText("移行先ユーザー"), target.uid);
  await user.click(screen.getByRole("button", { name: "移行内容を確認" }));
  const execute = await screen.findByRole("button", {
    name: "データを移行する",
  });
  expect(execute).toBeDisabled();
  expect(screen.getByText("見たよ")).toBeVisible();
  expect(screen.getByText(/コピーではありません/)).toBeVisible();
  await user.type(
    screen.getByLabelText("確認用の移行元メールアドレス"),
    source.email,
  );
  expect(execute).toBeDisabled();
  await user.type(
    screen.getByLabelText("確認用の移行先メールアドレス"),
    target.email,
  );
  await user.click(execute);
  await waitFor(() =>
    expect(transferUserData).toHaveBeenCalledWith(source.uid, {
      target_id: target.uid,
      source_confirmation: source.email,
      target_confirmation: target.email,
      preview_token: preview.preview_token,
    }),
  );
  expect(onClose).toHaveBeenCalled();
  expect(onTransferred).toHaveBeenCalled();
});

it("既存データがある移行先への実行を許可しない", async () => {
  vi.mocked(previewUserTransfer).mockResolvedValue({
    ...preview,
    blockers: ["移行先に既存の学習データがあります"],
  });
  const user = userEvent.setup();
  render(
    <UserDataTransfer
      source={source}
      users={[source, target]}
      onClose={vi.fn()}
      onTransferred={vi.fn()}
    />,
  );
  await user.selectOptions(screen.getByLabelText("移行先ユーザー"), target.uid);
  await user.click(screen.getByRole("button", { name: "移行内容を確認" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "既存の学習データ",
  );
  await user.type(
    screen.getByLabelText("確認用の移行元メールアドレス"),
    source.email,
  );
  await user.type(
    screen.getByLabelText("確認用の移行先メールアドレス"),
    target.email,
  );
  expect(
    screen.getByRole("button", { name: "データを移行する" }),
  ).toBeDisabled();
});

it("確認後に変更があれば、プレビューを破棄して再確認を求める", async () => {
  vi.mocked(transferUserData).mockRejectedValue(
    new Error("データが変わりました。移行内容を再確認してください"),
  );
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <UserDataTransfer
      source={source}
      users={[source, target]}
      onClose={onClose}
      onTransferred={vi.fn()}
    />,
  );
  await user.selectOptions(screen.getByLabelText("移行先ユーザー"), target.uid);
  await user.click(screen.getByRole("button", { name: "移行内容を確認" }));
  await screen.findByRole("button", { name: "データを移行する" });
  await user.type(
    screen.getByLabelText("確認用の移行元メールアドレス"),
    source.email,
  );
  await user.type(
    screen.getByLabelText("確認用の移行先メールアドレス"),
    target.email,
  );
  await user.click(screen.getByRole("button", { name: "データを移行する" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("再確認");
  expect(screen.queryByRole("button", { name: "データを移行する" })).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
});
