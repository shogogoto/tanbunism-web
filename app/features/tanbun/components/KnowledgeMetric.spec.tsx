import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KnowledgePageRank, KnowledgeScore } from "./KnowledgeMetric";

it("スコアとPageRankを色で分け、hoverで説明する", async () => {
  const user = userEvent.setup();
  render(
    <>
      <KnowledgeScore score={12} />
      <KnowledgePageRank value={2.345} />
    </>,
  );
  const score = screen.getByRole("button", { name: "スコア: 12" });
  const rank = screen.getByRole("button", { name: "PageRank: 2.35" });
  expect(score).toHaveClass("text-blue-700", "dark:text-blue-300");
  expect(rank).toHaveClass("text-purple-700", "dark:text-purple-300");
  await user.hover(score);
  expect(await screen.findByRole("tooltip")).toHaveTextContent("関係数の合計");
  await user.unhover(score);
  await waitFor(() =>
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
  );
  await user.hover(rank);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "参照・推論のつながりから求めた重要度",
  );
});

it("タップで説明を開閉し、未計算の理由も示す", async () => {
  const user = userEvent.setup();
  render(<KnowledgePageRank value={null} />);
  const trigger = screen.getByRole("button", {
    name: "PageRank: 未計算・要再計算",
  });
  expect(trigger).toHaveTextContent("—");
  await user.pointer({ keys: "[TouchA]", target: trigger });
  const dialog = await screen.findByRole("dialog", { name: "PageRankの説明" });
  expect(dialog).toHaveTextContent("リソース内の平均は1です");
  expect(dialog).toHaveTextContent("再計算が必要です");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  await user.click(trigger);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("キーボードでも説明を開きEscapeで戻れる", async () => {
  const user = userEvent.setup();
  render(<KnowledgeScore score={0} />);
  await user.tab();
  await user.keyboard("{Enter}");
  expect(
    await screen.findByRole("dialog", { name: "スコアの説明" }),
  ).toHaveTextContent("重みを反映");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "スコア: 0" })).toHaveFocus();
});
