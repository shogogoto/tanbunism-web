import { beforeEach, describe, expect, it } from "vitest";
import { loadUploadHistory, saveUploadResult } from "./history";

function makeFile(lastModified = 100) {
  return new File(["memo"], "memo.kn", { lastModified });
}

describe("upload history", () => {
  beforeEach(() => localStorage.clear());

  it("取り込み結果を次回のフォルダ表示用に保存する", () => {
    const file = makeFile();
    const history = saveUploadResult([], file, "notes/memo.kn", {
      ok: true,
      retryable: false,
      resourceId: "resource-1",
    });

    expect(history[0]).toMatchObject({
      ok: true,
      resourceId: "resource-1",
      path: "notes/memo.kn",
    });
    expect(loadUploadHistory()).toHaveLength(1);
  });

  it("同じパスの履歴は最新結果で置き換える", () => {
    const file = makeFile();
    const failed = saveUploadResult([], file, "notes/memo.kn", {
      ok: false,
      retryable: true,
      message: "通信エラー",
    });
    const recovered = saveUploadResult(failed, file, "notes/memo.kn", {
      ok: true,
      retryable: false,
    });

    expect(recovered).toHaveLength(1);
    expect(recovered[0]?.ok).toBe(true);
  });
});
