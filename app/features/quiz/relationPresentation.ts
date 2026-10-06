import type { ReadableQuiz } from "./api";

type Relation = NonNullable<ReadableQuiz["prompt"]["relations"]>[number];

const descriptions: Record<string, string> = {
  親: "BはAの親にあたる",
  詳細: "BはAの詳細にあたる",
  同階層: "BはAと同じ階層にある",
  前提: "BはAの前提となる",
  結論: "BはAから導かれる結論である",
  用語参照: "AがBを参照している",
  被参照: "AはBから参照されている",
  一般: "BはAを一般化した内容である",
  具体例: "BはAの具体例である",
};

function targetPhrase(from: string, relation: string): string | undefined {
  const phrases: Record<string, string> = {
    親: `${from}の親`,
    詳細: `${from}の詳細`,
    同階層: `${from}と同じ階層の単文`,
    前提: `${from}の前提`,
    結論: `${from}から導かれる結論`,
    用語参照: `${from}が参照している単文`,
    被参照: `${from}を参照している単文`,
    一般: `${from}を一般化した内容`,
    具体例: `${from}の具体例`,
  };
  return phrases[relation];
}

function relationTarget(relations: string[]): string | undefined {
  let current = "A";
  for (const [index, relation] of relations.entries()) {
    const next = targetPhrase(
      index === 0 ? current : `「${current}」`,
      relation,
    );
    if (!next) return undefined;
    current = next;
  }
  return relations.length ? current : undefined;
}

/** DBの選択肢ID・正解判定を変えず、関係名だけを文章にする。 */
export function quizOptionLabel(
  quiz: Pick<ReadableQuiz, "quiz_type">,
  option: string,
) {
  if (quiz.quiz_type !== "pair2rel") return option;
  if (descriptions[option]) return descriptions[option];
  const target = relationTarget(option.split("の"));
  return target ? `Bは${target}にあたる` : option;
}

function relationName({ name, is_forward }: Relation): string | undefined {
  // RESOLVEDは参照される定義元から引用先へ向く。表示上の「参照」と逆。
  const names: Record<string, [string, string]> = {
    BELOW: ["親", "詳細"],
    TO: ["前提", "結論"],
    RESOLVED: ["用語参照", "被参照"],
    EXAMPLE: ["一般", "具体例"],
    SIBLING: ["同階層", "同階層"],
  };
  return name ? names[name.toUpperCase()]?.[is_forward ? 1 : 0] : undefined;
}

export function relationQuestion(relations: Relation[] = []): string {
  const names = relations.map(relationName);
  const questions: Record<string, string> = {
    親: "Aの親にあたる単文は？",
    詳細: "Aの詳細にあたる単文は？",
    同階層: "Aと同じ階層の単文は？",
    前提: "Aの前提となる単文は？",
    結論: "Aから導かれる結論は？",
    用語参照: "Aが参照している単文は？",
    被参照: "Aを参照している単文は？",
    一般: "Aを一般化した単文は？",
    具体例: "Aの具体例にあたる単文は？",
  };
  if (names.length === 1 && names[0]) return questions[names[0]];
  if (names.length && names.every((name) => name !== undefined)) {
    const target = relationTarget(names);
    if (target) return `${target}にあたるのは？`;
  }
  // 未知の関係は意味を推測せず、その名称と向きだけを明示する。
  const path = relations
    .map(
      (relation) =>
        `「${relation.name ?? "不明"}（${relation.is_forward ? "順方向" : "逆方向"}）」`,
    )
    .join("、");
  return path ? `Aから${path}の順にたどった単文は？` : "Aと関係する単文は？";
}
