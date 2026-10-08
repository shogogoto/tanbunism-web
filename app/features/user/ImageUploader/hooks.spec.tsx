import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { SWRConfig } from "swr";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { AuthProvider, useAuth } from "~/features/auth/AuthProvider";
import { useOnUploadSuccess } from "./hooks";

const originalUser = {
  uid: "25fe8b78-9f8a-4f70-85f3-cfa28a780402",
  email: "avatar-test@example.com",
  username: "avatar_test",
  display_name: "Avatar Test",
  profile: "Keep this profile",
  avatar_url: "https://example.com/old.png",
  is_active: true,
  is_verified: true,
  is_superuser: false,
  created: "2026-01-01T00:00:00Z",
};
const uploadedUrl =
  "https://res.cloudinary.com/test/image/upload/v123/avatar/test/new.png";
const savedUrl =
  "https://res.cloudinary.com/test/image/upload/v124/avatar/test/new.png";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  localStorage.clear();
  server.use(http.get("*/user/me", () => HttpResponse.json(originalUser)));
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function AvatarEditor() {
  const { user } = useAuth();
  const { onUploadSuccess } = useOnUploadSuccess();
  const [error, setError] = useState("");
  return (
    <>
      <img src={user?.avatar_url ?? undefined} alt="avatar" />
      <span>{user?.display_name}</span>
      <span>{user?.profile}</span>
      <button
        type="button"
        onClick={() =>
          void onUploadSuccess(uploadedUrl).catch((cause) =>
            setError(cause.message),
          )
        }
      >
        Save uploaded avatar
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

function setup() {
  const cache = new Map();
  return render(
    <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
      <AuthProvider>
        <AvatarEditor />
      </AuthProvider>
    </SWRConfig>,
  );
}

describe("avatar upload persistence", () => {
  it("patches only the avatar and updates the visible and persisted user from the API response", async () => {
    let received: unknown;
    server.use(
      http.patch("*/user/me", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...originalUser, avatar_url: savedUrl });
      }),
    );
    setup();
    await screen.findByText(originalUser.display_name);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Save uploaded avatar" }));
    await waitFor(() =>
      expect(screen.getByAltText("avatar")).toHaveAttribute("src", savedUrl),
    );
    expect(received).toEqual({ avatar_url: uploadedUrl });
    expect(screen.getByText(originalUser.profile)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("auth-user") ?? "null").data.avatar_url,
      ).toBe(savedUrl),
    );
  });

  it("leaves the old avatar and cache unchanged when saving fails", async () => {
    server.use(
      http.patch("*/user/me", () =>
        HttpResponse.json(
          { detail: "画像の保存を拒否しました" },
          { status: 400 },
        ),
      ),
    );
    setup();
    await screen.findByText(originalUser.display_name);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Save uploaded avatar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "画像の保存を拒否しました",
    );
    expect(screen.getByAltText("avatar")).toHaveAttribute(
      "src",
      originalUser.avatar_url,
    );
    expect(
      JSON.parse(localStorage.getItem("auth-user") ?? "null").data.avatar_url,
    ).toBe(originalUser.avatar_url);
  });
});
