import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadUnit, { describeUploadError } from "./UploadUnit";

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
        onResult={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));

    rerender(
      <UploadUnit
        file={file}
        isUploading
        onResult={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
  });

  it("内容エラーは再送不要として修正方法を示す", () => {
    const result = describeUploadError(
      400,
      "[UnexpectedToken] Unexpected token Token('TIME', '本文')",
    );
    expect(result.retryable).toBe(false);
    expect(result.message).toContain("見出し");
  });

  it("通信エラーだけは再送可能にする", () => {
    const result = describeUploadError(undefined, "NetworkError");
    expect(result.retryable).toBe(true);
    expect(result.message).toContain("再送");
  });
});
