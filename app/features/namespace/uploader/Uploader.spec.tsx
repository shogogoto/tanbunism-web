import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Uploader from "./Uploader";

const { postText } = vi.hoisted(() => ({
  postText: vi.fn(),
}));

vi.mock("./uploadApi", () => ({
  saveResourceText: postText,
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
    postText.mockReset();
    postText.mockResolvedValue({
      status: 200,
      data: { resource_id: "resource-id", changed: true },
    });
  });

  it("解析に成功したファイルをそのまま取り込む", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Uploader />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "テスト用フォルダを選択" }),
    );
    await user.click(
      screen.getByRole("button", { name: "1件を解析して取り込む" }),
    );

    await waitFor(() => expect(postText).toHaveBeenCalledOnce());
    expect(postText).toHaveBeenCalledWith(
      {
        txt: "# title\n  sentence",
        path: ["humanities", "memo.tb"],
        identity_resolutions: [],
      },
      { credentials: "include" },
    );
    expect(await screen.findByText("変更あり")).toBeVisible();
  });

  it("ローカル履歴があってもDBへ取り込み直す", async () => {
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
      screen.getByRole("button", { name: "1件を解析して取り込む" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "1件を解析して取り込む" }),
    );
    await waitFor(() => expect(postText).toHaveBeenCalledOnce());
  });

  it("一部のファイルがエラーでも正常なファイルは取り込む", async () => {
    postText
      .mockResolvedValueOnce({
        status: 200,
        data: {
          resource_id: "resource-id",
          changed: true,
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
    await user.click(
      screen.getByRole("button", { name: "2件を解析して取り込む" }),
    );

    await waitFor(() => expect(postText).toHaveBeenCalledTimes(2));
    expect(postText.mock.calls[0]?.[0].path).toEqual(["humanities", "memo.tb"]);
  });

  it("import対象をページ本体の通常フローに並べる", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Uploader />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "2ファイルを選択" }));

    const toolbar = screen.getByRole("region", { name: "import操作" });
    const list = screen.getByRole("list", { name: "import対象" });
    expect(toolbar).toHaveClass("sticky");
    expect(list).not.toHaveClass("overflow-y-auto", "h-full");
    expect(list).toHaveTextContent("notes/humanities/memo.tb");
    expect(list).toHaveTextContent("notes/humanities/invalid.tb");
  });

  it("処理中のファイルと全体件数を表示する", async () => {
    let complete:
      | ((result: {
          status: number;
          data: { resource_id: string; changed: boolean };
        }) => void)
      | undefined;
    postText.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Uploader />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "2ファイルを選択" }));
    await user.click(
      screen.getByRole("button", { name: "2件を解析して取り込む" }),
    );

    expect(
      screen.getByRole("status", {
        name: "取り込み中: notes/humanities/memo.tb",
      }),
    ).toHaveTextContent("1 / 2");

    complete?.({
      status: 200,
      data: { resource_id: "resource-id", changed: true },
    });
    await waitFor(() => expect(postText).toHaveBeenCalledTimes(2));
  });
});
