import { beforeEach, describe, expect, it } from "vitest";
import { loadUploadHistory, previousResult, saveUploadResult } from "./history";

function makeFile(lastModified = 100) {
  return new File(["memo"], "memo.kn", { lastModified });
}

describe("upload history", () => {
  beforeEach(() => localStorage.clear());

  it("同じパス・サイズ・更新日時の成功ファイルは送信を省略する", () => {
    const file = makeFile();
    const history = saveUploadResult([], file, "notes/memo.kn", {
      ok: true,
      retryable: false,
    });

    expect(previousResult(history, file, "notes/memo.kn")).toMatchObject({
      ok: true,
      skipped: true,
    });
    expect(loadUploadHistory()).toHaveLength(1);
  });

  it("内容を変更したファイルは再送対象にする", () => {
    const oldFile = makeFile(100);
    const newFile = makeFile(200);
    const history = saveUploadResult([], oldFile, "notes/memo.kn", {
      ok: false,
      retryable: false,
      message: "修正してください",
    });

    expect(previousResult(history, newFile, "notes/memo.kn")).toBeUndefined();
  });

  it("通信エラーはファイルが同じでも再送対象にする", () => {
    const file = makeFile();
    const history = saveUploadResult([], file, "notes/memo.kn", {
      ok: false,
      retryable: true,
      message: "通信エラー",
    });

    expect(previousResult(history, file, "notes/memo.kn")).toBeUndefined();
  });
});
