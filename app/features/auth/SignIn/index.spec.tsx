import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { RouterProvider, createMemoryRouter } from "react-router";
import { getAuthMock } from "~/shared/generated/auth/auth.msw";
import { getUserMock } from "~/shared/generated/user/user.msw";
import SignInForm, { UserSignInAction } from ".";
import { AuthProvider } from "../AuthProvider";
import * as AuthMock from "../AuthProvider";

const server = setupServer(...getUserMock(), ...getAuthMock());
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const routesFixture = [
  {
    path: "/login",
    action: UserSignInAction,
    Component: () => (
      <AuthProvider>
        <SignInForm />
      </AuthProvider>
    ),
  },
  {
    path: "/dashboard",
    Component: () => <div>home</div>,
  },
  {
    path: "/",
    Component: () => <div>root</div>,
  },
];

describe("ログイン", () => {
  it("ログイン済みはダッシュボードへリダイレクト", async () => {
    const useAuthSpy = vi
      .spyOn(AuthMock, "useAuth")
      // @ts-ignore
      .mockReturnValue({ isAuthenticated: true });
    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/login"],
    });
    render(<RouterProvider router={router} />);
    await screen.findByText("home");
    expect(router.state.location.pathname).toBe("/dashboard");
    useAuthSpy.mockRestore();
  });
  it("ログイン成功でダッシュボードにリダイレクト", async () => {
    server.use(
      http.post("*/auth/cookie/login", async () => {
        await delay(200);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/login"],
    });
    render(<RouterProvider router={router} />);
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "送信" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    act(() => {
      user.click(submitButton);
    });
    waitFor(() => {
      expect(
        screen.getByRole("button", { name: "送信中..." }),
      ).toBeInTheDocument();
      // 送信中はdisable
      expect(submitButton).toBeDisabled();
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
    });

    waitFor(() => {
      expect(screen.getByText("home")).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });

  describe("フォームバリデーション", () => {
    beforeEach(() => {
      // @ts-ignore
      vi.spyOn(AuthMock, "useAuth").mockReturnValue({ isAuthenticated: false });
    });

    it("入力ないところを赤文字で注意", async () => {
      const user = userEvent.setup();
      const router = createMemoryRouter(routesFixture, {
        initialEntries: ["/login"],
      });
      render(<RouterProvider router={router} />);

      const submitButton = screen.getByRole("button", { name: "送信" });
      await user.click(submitButton);
      await waitFor(() => {
        const emailInvaild = screen.getByText("メールアドレスは必須です");
        const passwordInvaild = screen.getByText("パスワードは必須です");
        expect(emailInvaild.className).toMatch(/text-red-/);
        expect(passwordInvaild.className).toMatch(/text-red-/);
      });
    });
  });
});
