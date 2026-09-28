import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IdentityConflictDialog } from "./IdentityConflictDialog";

const conflict = {
  code: 409,
  type: "identity_conflict" as const,
  kind: "sentence" as const,
  message: "確認が必要です",
  conflicts: [
    {
      original: "以前の単文",
      candidates: [{ value: "書き直した単文", similarity: 0.9 }],
    },
  ],
};

describe("IdentityConflictDialog", () => {
  it("全競合を選ぶまで更新せず、選択結果をAPI形式で返す", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <IdentityConflictDialog
        conflict={conflict}
        filePath="notes/example.tb"
        open
        onOpenChange={vi.fn()}
        onResolve={onResolve}
      />,
    );

    const submit = screen.getByRole("button", { name: "選択内容で更新" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByLabelText(/この候補へ引き継ぐ/));
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(onResolve).toHaveBeenCalledWith([
      {
        kind: "sentence",
        original: "以前の単文",
        replacement: "書き直した単文",
      },
    ]);
  });

  it("別物として扱う選択はreplacementをnullにする", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <IdentityConflictDialog
        conflict={conflict}
        filePath="notes/example.tb"
        open
        onOpenChange={vi.fn()}
        onResolve={onResolve}
      />,
    );

    await user.click(screen.getByLabelText(/別の単文として扱う/));
    await user.click(screen.getByRole("button", { name: "選択内容で更新" }));

    expect(onResolve).toHaveBeenCalledWith([
      { kind: "sentence", original: "以前の単文", replacement: null },
    ]);
  });
});
