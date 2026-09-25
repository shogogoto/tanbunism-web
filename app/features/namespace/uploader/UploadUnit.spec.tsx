import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadUnit from "./UploadUnit";

const trigger = vi.fn();

vi.mock("~/shared/generated/entry/entry", () => ({
  usePostFilesResourcePost: () => ({
    data: undefined,
    error: undefined,
    isMutating: false,
    trigger,
  }),
}));

describe("UploadUnit", () => {
  beforeEach(() => {
    trigger.mockReset();
    trigger.mockResolvedValue({ status: 200 });
  });

  it("親が再描画されても同じアップロードを二重送信しない", async () => {
    const file = new File(["# title"], "memo.kn");
    const { rerender } = render(
      <UploadUnit
        file={file}
        isUploading
        onSuccess={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));

    rerender(
      <UploadUnit
        file={file}
        isUploading
        onSuccess={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
  });
});
