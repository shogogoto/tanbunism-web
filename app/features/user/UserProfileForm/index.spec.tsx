import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { describe, it, vi } from "vitest";
import { AuthProvider } from "~/features/auth/AuthProvider";
import { getAuthMock } from "~/shared/generated/auth/auth.msw";
import {
  getUserMock,
  getUsersCurrentUserUserMeGetMockHandler,
} from "~/shared/generated/user/user.msw";
import UserProfileForm from ".";
import { editUserProfile } from "./action";

const server = setupServer(...getUserMock(), ...getAuthMock());
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const muser = {
  uid: "test-uid",
  email: "test-email",
  is_active: true,
  is_superuser: false,
  is_verified: true,
  username: "test",
  display_name: "Test User",
  profile: "Test Profile", // 12文字
  avatar_url: "https://example.com/avatar.png",
  created: "2023-01-01",
};

function mkrouter() {
  return createMemoryRouter(
    [
      {
        path: "/user/edit",
        Component: () => (
          <AuthProvider>
            <UserProfileForm />
            <Toaster />
          </AuthProvider>
        ),
        action: editUserProfile,
      },
      {
        path: "/dashboard",
        Component: () => <div>home</div>,
      },
    ],
    {
      initialEntries: ["/user/edit"],
    },
  );
}

function _setmock() {
  let currentUser = { ...muser };
  server.use(
    getUsersCurrentUserUserMeGetMockHandler(currentUser),
    http.patch("*/user/me", async ({ request }) => {
      await delay(200);
      const updates = (await request.json()) as Partial<typeof muser>;
      currentUser = { ...currentUser, ...updates };
      return new HttpResponse(JSON.stringify(currentUser), { status: 200 });
    }),
  );
}

describe("UserProfileForm (Integration Test)", () => {
  beforeEach(() => {
    _setmock();
  });
  it("ユーザー情報がフォーム初期値へ", async () => {
    server.use(getUsersCurrentUserUserMeGetMockHandler(muser));
    const router = mkrouter();
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByLabelText("表示名")).toHaveValue(muser.display_name);
      expect(screen.getByLabelText("プロフィール")).toHaveValue(muser.profile);
      expect(screen.getByLabelText("ユーザー名")).toHaveValue(muser.username);
      expect(screen.getByText("12 / 160")).toBeInTheDocument();
    });
  });

  it("フォーム内容送信成功", async () => {
    const user = userEvent.setup();
    const router = mkrouter();
    render(<RouterProvider router={router} />);
    const displayNameInput = await screen.findByLabelText("表示名");
    const profileInput = screen.getByLabelText("プロフィール");
    const usernameInput = screen.getByLabelText("ユーザー名");
    const submitButton = screen.getByRole("button", { name: "更新" });

    const update = {
      display_name: "New Name",
      profile: "New Profile",
      username: "NewUsername",
    };

    await user.clear(displayNameInput);
    await user.clear(profileInput);
    await user.clear(usernameInput);
    await user.type(displayNameInput, update.display_name);
    await user.type(profileInput, update.profile);
    await user.type(usernameInput, update.username);
    await user.click(submitButton);

    // 入力値変更が反映される
    expect(displayNameInput).toHaveValue(update.display_name);
    expect(profileInput).toHaveValue(update.profile);
    expect(usernameInput).toHaveValue(update.username);
    await waitFor(() => {
      expect(
        screen.getByText("プロフィールを更新しました。"),
      ).toBeInTheDocument();
    });

    // 更新した値が古い値に戻らない
    await waitFor(() => {
      expect(displayNameInput).toHaveValue(update.display_name);
      expect(profileInput).toHaveValue(update.profile);
      expect(usernameInput).toHaveValue(update.username);
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });

  describe("フォームバリデーション", () => {
    beforeEach(() => {
      _setmock();
    });

    it("username invalid", async () => {
      _setmock();
      const user = userEvent.setup();
      const router = mkrouter();
      render(<RouterProvider router={router} />);
      const usernameInput = screen.getByLabelText("ユーザー名");
      const submitButton = screen.getByRole("button", { name: "更新" });

      const username = "New Username";
      await user.clear(usernameInput);
      await user.type(usernameInput, username);
      await user.click(submitButton);

      expect(
        await screen.findByText(
          /半角英数字とハイフン、アンダースコアのみが使用できます。/,
        ),
      ).toBeInTheDocument();
    });
  });
});
