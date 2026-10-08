import { describe, expect, it } from "vitest";
import { getTransformedImageUrl } from "./image";

describe("optimized avatar delivery", () => {
  it("preserves custom crop, version and asset identity", () => {
    const original =
      "https://res.cloudinary.com/cloud/image/upload/c_crop,w_500,h_400,x_10,y_20/v123/avatar/user/upload.jpg";
    const result = getTransformedImageUrl(original, 256, 256);
    expect(result).toBe(
      "https://res.cloudinary.com/cloud/image/upload/c_crop,w_500,h_400,x_10,y_20/c_fill,w_256,h_256,q_auto,f_auto/v123/avatar/user/upload.jpg",
    );
    expect(getTransformedImageUrl(result, 256, 256)).toBe(result);
  });
  it("supports legacy URLs and leaves external avatars unchanged", () => {
    expect(
      getTransformedImageUrl(
        "https://res.cloudinary.com/cloud/image/upload/avatar/user.jpg",
        256,
        256,
      ),
    ).toContain("/c_fill,w_256,h_256,q_auto,f_auto/avatar/user.jpg");
    expect(
      getTransformedImageUrl("https://google.example/avatar.jpg", 256, 256),
    ).toBe("https://google.example/avatar.jpg");
    expect(getTransformedImageUrl("bad-url", 256, 256)).toBe("bad-url");
    expect(getTransformedImageUrl(null, 256, 256)).toBeUndefined();
  });
});
