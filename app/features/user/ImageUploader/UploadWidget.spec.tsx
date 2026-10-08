import type { CloudinaryUploadWidgetOptions } from "@cloudinary-util/types";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import UploadWidget from "./UploadWidget";
import { imageRequest } from "./api";

vi.mock("./api", () => ({ imageRequest: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.hoisted(() => {
  vi.stubEnv("VITE_CLOUD_NAME", "test-cloud");
  vi.stubEnv("VITE_CLOUDINARY_API_KEY", "test-key");
  vi.stubEnv("VITE_UPLOAD_PRESET", "avatars");
});
afterEach(() => vi.resetAllMocks());
afterAll(() => vi.unstubAllEnvs());

const request = {
  timestamp: 123,
  folder: "avatar",
  upload_preset: "avatars",
  source: "uw",
  custom_coordinates: "10,20,100,200",
};

async function setup() {
  const widget = { open: vi.fn(), destroy: vi.fn() };
  const create = vi.fn().mockReturnValue(widget);
  window.cloudinary = { createUploadWidget: create };
  render(
    <UploadWidget publicId="owner" onUploadSuccess={vi.fn()}>
      <button type="button">画像を選ぶ</button>
    </UploadWidget>,
  );
  const script = document.querySelector(
    'script[src="https://upload-widget.cloudinary.com/latest/global/all.js"]',
  );
  act(() => script?.dispatchEvent(new Event("load")));
  await waitFor(() => expect(create).toHaveBeenCalled());
  const options = create.mock.calls[0][0] as CloudinaryUploadWidgetOptions & {
    prepareUploadParams: (
      callback: (params: Record<string, unknown> | object[]) => void,
      requests: Record<string, unknown> | Record<string, unknown>[],
    ) => Promise<void>;
  };
  return { options, widget };
}

describe("avatar upload widget", () => {
  it("limits images, assigns a new ID per upload and authenticates signatures", async () => {
    const { options, widget } = await setup();
    expect(options.multiple).toBe(false);
    expect(options.maxImageFileSize).toBe(5000000);
    expect(options.maxImageWidth).toBe(1024);
    expect(options.clientAllowedFormats).not.toContain("svg");
    expect(options.uploadSignature).toBeUndefined();
    vi.mocked(imageRequest).mockResolvedValue({ signature: "signed" });
    const prepare = vi.fn();
    await options.prepareUploadParams(prepare, request);
    await options.prepareUploadParams(prepare, request);
    expect(prepare.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        publicId: expect.stringMatching(/^owner\//),
        overwrite: false,
        invalidate: true,
        signature: "signed",
      }),
    );
    expect(prepare.mock.calls[0][0]).not.toHaveProperty(
      "uploadSignatureTimestamp",
    );
    expect(prepare.mock.calls[0][0].publicId).not.toBe(
      prepare.mock.calls[1][0].publicId,
    );
    for (let index = 0; index < 2; index++) {
      const [url, init] = vi.mocked(imageRequest).mock.calls[index];
      expect(url).toBe("/user/avatar/sign");
      expect(JSON.parse(String(init?.body))).toEqual({
        params: {
          ...request,
          timestamp: "123",
          public_id: prepare.mock.calls[index][0].publicId,
          overwrite: "false",
          invalidate: "true",
        },
      });
    }
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "画像を選ぶ" }));
    expect(widget.open).toHaveBeenCalled();
  });

  it("signs each file when the widget supplies an array", async () => {
    const { options } = await setup();
    vi.mocked(imageRequest).mockResolvedValue({ signature: "signed" });
    const callback = vi.fn();
    await options.prepareUploadParams(callback, [request, request]);
    expect(imageRequest).toHaveBeenCalledTimes(2);
    const prepared = callback.mock.calls[0][0];
    expect(prepared).toHaveLength(2);
    expect(prepared[0].signature).toBe("signed");
    expect(prepared[1].signature).toBe("signed");
    expect(prepared[0].publicId).not.toBe(prepared[1].publicId);
  });

  it("cancels upload instead of falling back to unsigned when signing fails", async () => {
    const { options } = await setup();
    vi.mocked(imageRequest).mockRejectedValue(
      new Error("署名サービス unavailable"),
    );
    const callback = vi.fn();
    await options.prepareUploadParams(callback, request);
    expect(callback).toHaveBeenCalledExactlyOnceWith({ cancel: true });
    expect(toast.error).toHaveBeenCalledWith("署名サービス unavailable");
  });

  it("cancels upload when the signing endpoint returns no signature", async () => {
    const { options } = await setup();
    vi.mocked(imageRequest).mockResolvedValue({});
    const callback = vi.fn();
    await options.prepareUploadParams(callback, request);
    expect(callback).toHaveBeenCalledExactlyOnceWith({ cancel: true });
    expect(toast.error).toHaveBeenCalledWith(
      "画像アップロードの署名を取得できませんでした",
    );
  });
});
