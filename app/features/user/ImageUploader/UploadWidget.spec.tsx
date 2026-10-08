import type { CloudinaryUploadWidgetOptions } from "@cloudinary-util/types";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import UploadWidget from "./UploadWidget";
import { imageRequest } from "./api";

vi.mock("./api", () => ({ imageRequest: vi.fn() }));
afterEach(() => vi.clearAllMocks());

describe("avatar upload widget", () => {
  it("limits images, assigns a new ID per upload and authenticates signatures", async () => {
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
        callback: (params: Record<string, unknown>) => void,
      ) => void;
    };
    expect(options.multiple).toBe(false);
    expect(options.maxImageFileSize).toBe(5000000);
    expect(options.maxImageWidth).toBe(1024);
    expect(options.clientAllowedFormats).not.toContain("svg");
    const prepare = vi.fn();
    options.prepareUploadParams(prepare);
    options.prepareUploadParams(prepare);
    expect(prepare.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        publicId: expect.stringMatching(/^owner\//),
        overwrite: false,
      }),
    );
    expect(prepare.mock.calls[0][0].publicId).not.toBe(
      prepare.mock.calls[1][0].publicId,
    );
    vi.mocked(imageRequest).mockResolvedValue({ signature: "signed" });
    const callback = vi.fn();
    await (
      options.uploadSignature as (
        callback: (signature: string) => void,
        params: object,
      ) => Promise<void>
    )(callback, { timestamp: 123, overwrite: false });
    expect(imageRequest).toHaveBeenCalledWith(
      "/user/avatar/sign",
      expect.objectContaining({
        body: JSON.stringify({
          params: { timestamp: "123", overwrite: "false" },
        }),
      }),
    );
    expect(callback).toHaveBeenCalledWith("signed");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "画像を選ぶ" }));
    expect(widget.open).toHaveBeenCalled();
  });
});
