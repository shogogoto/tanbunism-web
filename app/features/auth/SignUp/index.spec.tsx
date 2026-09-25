/**
 * SignInとvalidationは同じ
 * 重複していない箇所だけテスト
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { RouterProvider, createMemoryRouter } from "react-router";
import { getAuthMock } from "~/shared/generated/auth/auth.msw";
import { getUserMock } from "~/shared/generated/user/user.msw";
import SignUpForm, { UserRegisterAction } from ".";

const server = setupServer(...getUserMock(), ...getAuthMock());
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const routesFixture = [
  {
    path: "/register",
    action: UserRegisterAction,
    Component: SignUpForm,
  },
  {
    path: "/dashboard",
    Component: () => <div>home</div>,
  },
];

describe("ユーザー作成", () => {
  it("成功したらログイン済ませてダッシュボードへ", async () => {
    // ログインAPIのモックが期待通り204を返すように上書き
    server.use(
      http.post("*/auth/cookie/login", () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/register"],
    });
    render(<RouterProvider router={router} />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "送信" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);
    waitFor(() => {
      expect(screen.getByText("home")).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });

  it("重複ユーザー作成で怒られる", async () => {
    server.use(
      http.post("*/auth/register", () => {
        return new HttpResponse(
          JSON.stringify({
            detail: "REGISTER_USER_ALREADY_EXISTS",
            status: 400,
          }),
        );
      }),
    );

    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/register"],
    });
    render(<RouterProvider router={router} />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "送信" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    const errorMsg = await screen.findByText(/REGISTER_USER_ALREADY_EXISTS/);
    expect(errorMsg).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "送信" })).toBeInTheDocument();
  });
});
