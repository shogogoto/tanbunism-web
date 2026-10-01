import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadUnit, {
  describeUploadError,
  readIdentityConflict,
} from "./UploadUnit";

const { trigger, postText } = vi.hoisted(() => ({
  trigger: vi.fn(),
  postText: vi.fn(),
}));

vi.mock("~/shared/generated/entry/entry", () => ({
  postTextResourceTextPost: postText,
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
    postText.mockReset();
    trigger.mockResolvedValue({
      status: 200,
      data: { resource_ids: ["resource-1"] },
    });
  });

  it("親が再描画されても同じアップロードを二重送信しない", async () => {
    const file = new File(["# title"], "memo.kn");
    const onResult = vi.fn();
    const { rerender } = render(
      <UploadUnit
        file={file}
        isUploading
        onResult={onResult}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(trigger).toHaveBeenCalledTimes(1));
    expect(onResult).toHaveBeenCalledWith({
      ok: true,
      retryable: false,
      resourceId: "resource-1",
    });

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

  it("事前確認で選んだ同一性解決を確定時にも送る", async () => {
    postText.mockResolvedValue({
      status: 200,
      data: { resource_id: "resource" },
    });
    const resolution = {
      kind: "sentence" as const,
      original: "旧単文",
      replacement: "新単文",
    };
    render(
      <UploadUnit
        file={new File(["# title"], "humanities/memo.tb")}
        isUploading
        identityResolutions={[resolution]}
        onResult={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(postText).toHaveBeenCalledTimes(1));
    expect(trigger).not.toHaveBeenCalled();
    expect(postText).toHaveBeenCalledWith(
      {
        txt: "# title",
        path: ["humanities", "memo.tb"],
        identity_resolutions: [resolution],
      },
      { credentials: "include" },
    );
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
    expect(result.details).toBe("NetworkError");
  });

  it("詳細不明の409を取り込み済みと決めつけない", () => {
    const result = describeUploadError(409, "同時に更新されました");
    expect(result.retryable).toBe(true);
    expect(result.message).toContain("競合");
    expect(result.details).toBe("同時に更新されました");
  });

  it("FastAPIのdetailに包まれた同一性競合を読み取る", () => {
    const conflict = readIdentityConflict({
      detail: {
        code: 409,
        type: "identity_conflict",
        kind: "sentence",
        message: "確認が必要です",
        conflicts: [{ original: "旧文", candidates: [] }],
      },
    });

    expect(conflict?.conflicts[0]?.original).toBe("旧文");
  });

  it("単文と用語の競合が続いても前の選択を保持して再送する", async () => {
    const user = userEvent.setup();
    trigger.mockResolvedValue({
      status: 409,
      data: {
        detail: {
          code: 409,
          type: "identity_conflict",
          kind: "sentence",
          message: "単文を確認",
          conflicts: [
            {
              original: "旧単文",
              candidates: [{ value: "新単文", similarity: 0.9 }],
            },
          ],
        },
      },
    });
    postText
      .mockResolvedValueOnce({
        status: 409,
        data: {
          code: 409,
          type: "identity_conflict",
          kind: "term",
          message: "用語を確認",
          conflicts: [
            {
              original: "旧用語",
              candidates: [{ value: "新用語", similarity: 0.8 }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { resource_id: "resource" },
      });

    render(
      <UploadUnit
        file={new File(["# title"], "humanities/memo.tb")}
        isUploading
        onResult={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    await user.click(await screen.findByLabelText(/この候補へ引き継ぐ/));
    await user.click(screen.getByRole("button", { name: "選択内容で更新" }));
    await user.click(await screen.findByLabelText(/この候補へ引き継ぐ/));
    await user.click(screen.getByRole("button", { name: "選択内容で更新" }));

    await waitFor(() => expect(postText).toHaveBeenCalledTimes(2));
    expect(postText.mock.calls[1]?.[0].identity_resolutions).toEqual([
      { kind: "sentence", original: "旧単文", replacement: "新単文" },
      { kind: "term", original: "旧用語", replacement: "新用語" },
    ]);
  });
});
