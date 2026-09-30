import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Uploader from "./Uploader";

const { preview, postText } = vi.hoisted(() => ({
  preview: vi.fn(),
  postText: vi.fn(),
}));

vi.mock("~/shared/generated/entry/entry", () => ({
  previewTextUpdateResourceTextPreviewPost: preview,
  postTextResourceTextPost: postText,
}));

vi.mock("./CustomFileUploader", () => ({
  default: ({ setFiles }: { setFiles: (files: File[]) => void }) => {
    const makeFile = (name: string, path: string) => {
      const file = new File(["# title\n  sentence"], name, {
        lastModified: 123,
      });
      Object.defineProperty(file, "webkitRelativePath", { value: path });
      return file;
    };
    return (
      <>
        <button
          type="button"
          onClick={() =>
            setFiles([makeFile("memo.tb", "notes/humanities/memo.tb")])
          }
        >
          テスト用フォルダを選択
        </button>
        <button
          type="button"
          onClick={() =>
            setFiles([
              makeFile("memo.tb", "notes/humanities/memo.tb"),
              makeFile("invalid.tb", "notes/humanities/invalid.tb"),
            ])
          }
        >
          2ファイルを選択
        </button>
      </>
    );
  },
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
    postText.mockReset();
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
    postText.mockResolvedValue({
      status: 200,
      data: { resource_id: "resource-id" },
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

    await user.click(screen.getByRole("button", { name: "1件を取り込む" }));

    await waitFor(() => expect(postText).toHaveBeenCalledOnce());
    expect(postText).toHaveBeenCalledWith(
      {
        txt: "# title\n  sentence",
        path: ["humanities", "memo.tb"],
        identity_resolutions: [],
      },
      { credentials: "include" },
    );
    expect(await screen.findByText("変更なし")).toBeVisible();
  });

  it("ローカル履歴があってもDBの差分を確認し直す", async () => {
    localStorage.setItem(
      "tanbunism.upload-history",
      JSON.stringify([
        {
          path: "notes/humanities/memo.tb",
          size: new Blob(["# title\n  sentence"]).size,
          lastModified: 123,
          recordedAt: Date.now(),
          ok: true,
          retryable: false,
        },
      ]),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Uploader />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "テスト用フォルダを選択" }),
    );

    expect(
      screen.getByRole("button", { name: "1件の変更を確認" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "1件の変更を確認" }));
    await waitFor(() => expect(preview).toHaveBeenCalledOnce());
  });

  it("一部のファイルがエラーでも正常なファイルは取り込む", async () => {
    preview
      .mockResolvedValueOnce({
        status: 200,
        data: {
          resource_id: "resource-id",
          is_new: true,
          sentences_added: 1,
          sentences_removed: 0,
          sentences_updated: 0,
          terms_added: 0,
          terms_removed: 0,
          terms_updated: 0,
        },
      })
      .mockResolvedValueOnce({
        status: 422,
        data: { detail: "UnexpectedToken" },
      });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Uploader />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "2ファイルを選択" }));
    await user.click(screen.getByRole("button", { name: "2件の変更を確認" }));

    expect(
      await screen.findByRole("button", { name: "1件を取り込む" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "1件を取り込む" }));

    await waitFor(() => expect(postText).toHaveBeenCalledOnce());
    expect(postText.mock.calls[0]?.[0].path).toEqual(["humanities", "memo.tb"]);
  });
});
