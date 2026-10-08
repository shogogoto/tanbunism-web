import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAvatarImage } from "./useAvatarImage";

describe("avatar image delivery", () => {
  const url =
    "https://res.cloudinary.com/cloud/image/upload/v123/avatar/user.jpg";
  it("retries the stored image when optimization is rejected, without looping", () => {
    const { result } = renderHook(() => useAvatarImage(url, 256, 256));
    expect(result.current.src).toContain("c_fill,w_256,h_256,q_auto,f_auto");
    act(() => result.current.onError());
    expect(result.current.src).toBe(url);
    act(() => result.current.onError());
    expect(result.current.src).toBe(url);
  });
  it("tries optimization again after changing the avatar", () => {
    const { result, rerender } = renderHook(
      ({ url }) => useAvatarImage(url, 256, 256),
      { initialProps: { url } },
    );
    act(() => result.current.onError());
    const replacement = url.replace("v123", "v124");
    rerender({ url: replacement });
    expect(result.current.src).toContain(
      "c_fill,w_256,h_256,q_auto,f_auto/v124",
    );
  });
  it("keeps missing and external avatars unchanged", () => {
    const { result } = renderHook(() => useAvatarImage(undefined, 256, 256));
    expect(result.current.src).toBeUndefined();
    const external = renderHook(() =>
      useAvatarImage("https://example.com/avatar.png", 256, 256),
    );
    act(() => external.result.current.onError());
    expect(external.result.current.src).toBe("https://example.com/avatar.png");
  });
});
