import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import AdminUserManager from ".";
import {
  deleteAdminResource,
  deleteAdminUser,
  getAdminResourceDeletionImpact,
  grantAdminUser,
  listAdminUserResources,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUserStatus,
} from "./api";

vi.mock("./api", () => ({
  listAdminUsers: vi.fn(),
  grantAdminUser: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  listAdminUserResources: vi.fn(),
  getAdminResourceDeletionImpact: vi.fn(),
  deleteAdminResource: vi.fn(),
  resetAdminUserPassword: vi.fn(),
  deleteAdminUser: vi.fn(),
}));

const targetUser = {
  uid: "user-1",
  email: "reader@example.com",
  display_name: "読書ユーザー",
  username: "reader",
  is_active: true,
  is_superuser: false,
  created: "2026-09-01T00:00:00Z",
  resource_count: 1,
};

const resource = {
  uid: "resource-1",
  name: "# 古い読書メモ",
  updated_at: "2026-09-20T00:00:00Z",
  sentence_count: 12,
};

beforeEach(() => {
  vi.mocked(grantAdminUser).mockResolvedValue({
    ...targetUser,
    is_superuser: true,
  });
  vi.mocked(listAdminUsers).mockResolvedValue([targetUser]);
  vi.mocked(updateAdminUserStatus).mockResolvedValue({
    ...targetUser,
    is_active: false,
  });
  vi.mocked(listAdminUserResources).mockResolvedValue([resource]);
  vi.mocked(getAdminResourceDeletionImpact).mockResolvedValue({
    resource_uid: resource.uid,
    resource_name: resource.name,
    owner_uid: targetUser.uid,
    owner_email: targetUser.email,
    sentence_count: 12,
    term_count: 3,
    quiz_count: 2,
    answer_count: 5,
    retiring_sentence_count: 2,
    deleting_sentence_count: 10,
  });
  vi.mocked(deleteAdminResource).mockResolvedValue({
    resource_uid: resource.uid,
    deleted_sentence_count: 10,
    retired_sentence_count: 2,
  });
  vi.mocked(resetAdminUserPassword).mockResolvedValue(undefined);
  vi.mocked(deleteAdminUser).mockResolvedValue({
    user_id: targetUser.uid,
    deleted_resource_count: 1,
    deleted_quiz_count: 2,
    deleted_answer_count: 3,
  });
});

it("メール確認後に管理者を設定し、付与後は停止・削除を無効にする", async () => {
  const user = userEvent.setup();
  render(<AdminUserManager />);
  await user.click(
    await screen.findByRole("button", {
      name: `${targetUser.email}を管理者に設定`,
    }),
  );
  const button = screen.getByRole("button", { name: "管理者に設定する" });
  expect(button).toBeDisabled();
  await user.type(
    screen.getByLabelText("確認のため対象ユーザーのメールアドレスを入力"),
    targetUser.email,
  );
  await user.click(button);
  await waitFor(() =>
    expect(grantAdminUser).toHaveBeenCalledWith(
      targetUser.uid,
      targetUser.email,
    ),
  );
  expect(await screen.findByText("管理者")).toBeVisible();
  expect(screen.getByRole("button", { name: "停止" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: `${targetUser.email}を削除` }),
  ).toBeDisabled();
});

it("通常ユーザーを確認して停止できる", async () => {
  const user = userEvent.setup();
  render(<AdminUserManager />);

  expect(await screen.findByText("読書ユーザー")).toBeInTheDocument();
  expect(screen.getByText("reader@example.com")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "停止" }));
  expect(screen.getByText(/直ちにAPIを利用できなくなります/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "停止する" }));

  await waitFor(() =>
    expect(updateAdminUserStatus).toHaveBeenCalledWith("user-1", false),
  );
  expect(await screen.findByText("停止中")).toBeVisible();
});

it("Resourceの影響を確認し、名前入力後に削除できる", async () => {
  const user = userEvent.setup();
  render(<AdminUserManager />);

  await user.click(await screen.findByRole("button", { name: "Resource" }));
  expect(await screen.findByText("# 古い読書メモ")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "削除" }));

  expect(await screen.findByText("関連Quiz")).toBeVisible();
  const deleteButton = screen.getByRole("button", { name: "完全に削除する" });
  expect(deleteButton).toBeDisabled();
  await user.type(
    screen.getByLabelText(/確認のためResource名/),
    "# 古い読書メモ",
  );
  await user.click(deleteButton);

  await waitFor(() =>
    expect(deleteAdminResource).toHaveBeenCalledWith(
      "resource-1",
      "# 古い読書メモ",
    ),
  );
  expect(screen.queryByText("# 古い読書メモ")).not.toBeInTheDocument();
});

it("通常ユーザーのパスワードを再設定できる", async () => {
  const user = userEvent.setup();
  render(<AdminUserManager />);

  await user.click(await screen.findByRole("button", { name: "パスワード" }));
  const passwordInputs = screen.getAllByLabelText(/新しいパスワード/);
  await user.type(passwordInputs[0], "new-password");
  await user.type(passwordInputs[1], "new-password");
  await user.click(screen.getByRole("button", { name: "変更する" }));

  await waitFor(() =>
    expect(resetAdminUserPassword).toHaveBeenCalledWith(
      targetUser.uid,
      "new-password",
    ),
  );
});

it("メールアドレス確認後に通常ユーザーを削除できる", async () => {
  const user = userEvent.setup();
  render(<AdminUserManager />);

  await user.click(
    await screen.findByRole("button", {
      name: `${targetUser.email}を削除`,
    }),
  );
  const deleteButton = screen.getByRole("button", {
    name: "ユーザーを削除する",
  });
  expect(deleteButton).toBeDisabled();
  await user.type(
    screen.getByLabelText("削除するユーザーのメールアドレス"),
    targetUser.email,
  );
  await user.click(deleteButton);

  await waitFor(() =>
    expect(deleteAdminUser).toHaveBeenCalledWith(
      targetUser.uid,
      targetUser.email,
    ),
  );
  expect(screen.queryByText("読書ユーザー")).not.toBeInTheDocument();
});
