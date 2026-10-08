import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usersPatchCurrentUserUserMePatch } from "~/shared/generated/user/user";
import { editUserProfile } from "./action";

vi.mock("~/shared/generated/user/user", () => ({
  usersPatchCurrentUserUserMePatch: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

describe("profile partial updates", () => {
  it.each([
    { avatar_url: "https://example.com/new.png" },
    { username: "test", display_name: "New name", profile: "" },
  ])("does not clear fields omitted from the form: %j", async (fields) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    // The response body is not interpreted by this action, only returned.
    vi.mocked(usersPatchCurrentUserUserMePatch).mockResolvedValue({
      status: 401,
      data: undefined,
      headers: new Headers(),
    });
    await editUserProfile({
      request: new Request("http://localhost/user/edit", {
        method: "PATCH",
        body: formData,
      }),
      params: {},
      url: new URL("http://localhost/user/edit"),
      pattern: "/user/edit",
      context: new RouterContextProvider(),
    });
    expect(usersPatchCurrentUserUserMePatch).toHaveBeenCalledExactlyOnceWith(
      fields,
      { credentials: "include" },
    );
  });
});
