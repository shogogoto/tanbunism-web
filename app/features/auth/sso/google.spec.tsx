import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router";
import { Navigate } from "react-router";
import {
  getGoogleMock,
  getOauthGoogleCookieAuthorizeGoogleCookieAuthorizeGetMockHandler,
} from "~/shared/generated/google/google.msw";
import { getUserMock } from "~/shared/generated/user/user.msw";
import { AuthProvider } from "../AuthProvider";
import GoogleCallback, { authorize, GoogleAuthButton } from "./google";

const server = setupServer(...getGoogleMock(), ...getUserMock());
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const fakeGoogleAuthUrl = "/fake-google-auth-page";
const title = "Googleログイン";
const routesFixture = [
  {
    path: "/somewhere",
    Component: () => <GoogleAuthButton title={title} />,
  },
  {
    path: "/google/authorize",
    loader: authorize,
    Component: () => <div>authorize dummy</div>,
  },
  {
    path: fakeGoogleAuthUrl,
    Component: () => <Navigate to="/google/callback?code=test&state=test" />,
  },
  {
    path: "/google/callback",
    Component: () => (
      <AuthProvider>
        <GoogleCallback />
      </AuthProvider>
    ),
    // loader: receiveCookie,
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

// { initialEntries: ["/login"] },
describe("Google SSO", () => {
  it("authorize成功", async () => {
    server.use(
      getOauthGoogleCookieAuthorizeGoogleCookieAuthorizeGetMockHandler({
        authorization_url: fakeGoogleAuthUrl,
      }),
    );
    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/somewhere"],
    });
    const user = userEvent.setup();
    render(<RouterProvider router={router} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/google/authorize");
    await user.click(link);
    // await waitFor(() => {
    //   expect(router.state.location.pathname).toBe(fakeGoogleAuthUrl);
    // });
    await screen.findByText("home");
  });

  it("authorize失敗で / へリダイレクト", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(
      http.get("*/google/cookie/authorize", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/somewhere"],
    });
    render(<RouterProvider router={router} />);
    await userEvent.click(await screen.findByText(title));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
    consoleSpy.mockRestore();
  });

  it("callback失敗で / へリダイレクト", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(
      getOauthGoogleCookieAuthorizeGoogleCookieAuthorizeGetMockHandler(
        // @ts-ignore
        (req, res, ctx) => res(ctx.status(500)),
      ),
    );

    const router = createMemoryRouter(routesFixture, {
      initialEntries: ["/somewhere"],
    });
    render(<RouterProvider router={router} />);
    await userEvent.click(await screen.findByText(title));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
    consoleSpy.mockRestore();
  });
});
