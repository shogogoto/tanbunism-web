import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Uploader from "./Uploader";

const { preview } = vi.hoisted(() => ({ preview: vi.fn() }));

vi.mock("~/shared/generated/entry/entry", () => ({
  previewTextUpdateResourceTextPreviewPost: preview,
}));

vi.mock("./CustomFileUploader", () => ({
  default: ({ setFiles }: { setFiles: (files: File[]) => void }) => (
    <button
      type="button"
      onClick={() => {
        const file = new File(["# title\n  sentence"], "memo.tb");
        Object.defineProperty(file, "webkitRelativePath", {
          value: "notes/humanities/memo.tb",
        });
        setFiles([file]);
      }}
    >
      テスト用フォルダを選択
    </button>
  ),
}));

vi.mock("./UploadUnit", async (importOriginal) => {
  const original = await importOriginal<typeof import("./UploadUnit")>();
  return {
    ...original,
    default: () => null,
  };
});

describe("Uploader", () => {
  beforeEach(() => {
    localStorage.clear();
    preview.mockReset();
    preview.mockResolvedValue({
      status: 200,
      data: {
        resource_id: "resource-id",
        is_new: false,
        sentences_added: 3,
        sentences_removed: 1,
        sentences_updated: 2,
        terms_added: 1,
        terms_removed: 0,
        terms_updated: 0,
      },
    });
  });

  it("保存前に変更内容を確認してから取り込める", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Uploader />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "テスト用フォルダを選択" }),
    );
    await user.click(screen.getByRole("button", { name: "1件の変更を確認" }));

    expect(await screen.findByText("単文追加 3")).toBeInTheDocument();
    expect(screen.getByText("変更あり")).toBeInTheDocument();
    expect(screen.getByText("単文更新 2")).toBeInTheDocument();
    expect(screen.getByText("単文退役 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1件を取り込む" })).toBeEnabled();
    expect(preview).toHaveBeenCalledWith(
      {
        txt: "# title\n  sentence",
        path: ["humanities", "memo.tb"],
        identity_resolutions: [],
      },
      { credentials: "include" },
    );
  });
});
