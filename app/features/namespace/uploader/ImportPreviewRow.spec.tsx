import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ImportPreviewRow } from "./ImportPreviewRow";

const changedPreview = {
  resource_id: "resource-1",
  is_new: false,
  sentences_added: 2,
  sentences_removed: 1,
  sentences_updated: 0,
  terms_added: 0,
  terms_removed: 0,
  terms_updated: 0,
};

describe("ImportPreviewRow", () => {
  it("差分があれば変更ありと表示し、既存Resourceへ移動できる", () => {
    render(
      <MemoryRouter>
        <ImportPreviewRow
          path="notes/memo.tb"
          state={{ status: "ready", resolutions: [], preview: changedPreview }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "変更あり" })).toHaveAttribute(
      "href",
      "/resource/resource-1",
    );
    expect(screen.getByText("単文追加 2")).toBeInTheDocument();
  });

  it("取込結果の変更有無を表示してResourceへ移動できる", () => {
    render(
      <MemoryRouter>
        <ImportPreviewRow
          path="notes/memo.tb"
          state={{ status: "ready", resolutions: [], preview: changedPreview }}
          result={{
            ok: true,
            retryable: false,
            skipped: false,
            resourceId: "resource-1",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "変更あり" })).toHaveAttribute(
      "href",
      "/resource/resource-1",
    );
    expect(screen.queryByText("単文追加 2")).not.toBeInTheDocument();
  });

  it("同一内容の再取込は変更なしと表示する", () => {
    render(
      <MemoryRouter>
        <ImportPreviewRow
          path="notes/memo.tb"
          result={{
            ok: true,
            retryable: false,
            skipped: true,
            resourceId: "resource-1",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "変更なし" })).toHaveAttribute(
      "href",
      "/resource/resource-1",
    );
  });

  it("コンフリクト表示からmerge画面を開く", async () => {
    const onOpenConflict = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ImportPreviewRow
          path="notes/memo.tb"
          state={{
            status: "conflict",
            resolutions: [],
            conflict: {
              code: 409,
              type: "identity_conflict",
              kind: "sentence",
              message: "確認が必要です",
              conflicts: [],
            },
          }}
          onOpenConflict={onOpenConflict}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "コンフリクト" }));
    expect(onOpenConflict).toHaveBeenCalledOnce();
  });
});
