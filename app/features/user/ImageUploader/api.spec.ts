import { afterEach, describe, expect, it, vi } from "vitest";
import signUpload, { deleteImage } from ".";
import { imageRequest } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("avatar API", () => {
  it("uses the backend session cookie and actual HTTP status", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ signature: "signed" }));
    vi.stubGlobal("fetch", fetch);
    expect(await imageRequest("/user/avatar/sign", { method: "POST" })).toEqual(
      { signature: "signed" },
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/user/avatar/sign"),
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
    fetch.mockResolvedValue(
      Response.json({ detail: "ログインしてください" }, { status: 401 }),
    );
    await expect(imageRequest("/user/avatar")).rejects.toThrow(
      "ログインしてください",
    );
  });
  it("disables the unauthenticated legacy signing and delete endpoints", async () => {
    expect((await signUpload()).status).toBe(410);
    expect((await deleteImage()).status).toBe(410);
  });
});
