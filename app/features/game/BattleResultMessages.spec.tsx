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

it("shows the selected trigger and actual targets below combat results only", () => {
  render(
    <BattleResultMessages
      quiz="正解"
      battle="ゴブリンの加速 · 不発"
      details={{ trigger: "味方：加速なし", targets: ["スケルトン"] }}
    />,
  );
  const battle = screen.getByRole("region", { name: "戦闘結果" });
  expect(within(battle).getByLabelText("行動の詳細")).toHaveTextContent(
    "発動条件：味方：加速なし → 対象：スケルトン",
  );
  expect(
    screen.getByRole("region", { name: "クイズ結果" }),
  ).not.toHaveTextContent("発動条件");
});
