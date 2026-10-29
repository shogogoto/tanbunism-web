import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import BattleResultMessages from "./BattleResultMessages";

it.each(["正解", "不正解", "時間切れ", "1/2問正解"])(
  "keeps %s with the quiz, separate from combat events",
  (quiz) => {
    render(
      <BattleResultMessages
        quiz={quiz}
        battle="戦う · 書庫の守護ゴーレムに17ダメージ"
      >
        <p>答え：用語</p>
      </BattleResultMessages>,
    );
    const quizResult = screen.getByRole("region", { name: "クイズ結果" });
    const battleResult = screen.getByRole("region", { name: "戦闘結果" });
    expect(quizResult).toHaveTextContent(quiz);
    expect(within(quizResult).getByText("答え：用語")).toBeVisible();
    expect(battleResult).toHaveTextContent(
      "戦う · 書庫の守護ゴーレムに17ダメージ",
    );
    expect(battleResult).not.toHaveTextContent(/正解|時間切れ|答え/);
    expect(quizResult).not.toHaveTextContent("ダメージ");
  },
);

it("does not invent a quiz verdict for actions without a quiz", () => {
  render(<BattleResultMessages battle="回復 · 発動" />);
  expect(
    screen.queryByRole("region", { name: "クイズ結果" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "戦闘結果" })).toHaveTextContent(
    "回復 · 発動",
  );
});
