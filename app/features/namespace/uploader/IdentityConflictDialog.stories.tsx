import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { IdentityConflictDialog } from "./IdentityConflictDialog";

const meta = {
  title: "読書メモ/同一性の競合解消",
  component: IdentityConflictDialog,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    open: true,
    onOpenChange: fn(),
    onResolve: fn(),
  },
} satisfies Meta<typeof IdentityConflictDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 単文の候補を比較: Story = {
  args: {
    filePath: "notes/humanities/8_科学哲学の冒険.tb",
    conflict: {
      code: 409,
      type: "identity_conflict",
      kind: "sentence",
      message: "更新前後の単文を自動で対応付けできません",
      conflicts: [
        {
          original: "ヒュームの呪いは前提における循環による疑似問題である",
          candidates: [
            {
              value:
                "ヒュームの呪いは、前提に含まれる循環から生まれる疑似問題である",
              similarity: 0.86,
            },
            {
              value:
                "帰納法は演繹だけでは正当化できないが、擁護することはできる",
              similarity: 0.61,
            },
          ],
        },
      ],
    },
  },
};

export const 複数の競合: Story = {
  args: {
    filePath: "notes/humanities/01_論理的思考の文化的基盤.tb",
    conflict: {
      code: 409,
      type: "identity_conflict",
      kind: "sentence",
      message: "更新前後の単文を自動で対応付けできません",
      conflicts: [
        {
          original: "歴史は偶然ではなく必然であり神が予め決めている",
          candidates: [
            {
              value:
                "イスラーム史観では歴史は偶然ではなく、神があらかじめ定めた必然である",
              similarity: 0.81,
            },
            {
              value: "歴史は教訓を得られる物語として重視される",
              similarity: 0.54,
            },
          ],
        },
        {
          original: "身体化： 神の言葉を暗記し反射できるよう体に覚えさせる",
          candidates: [
            {
              value: "身体化: 神の言葉を暗記し、反射できるまで身体に覚えさせる",
              similarity: 0.93,
            },
          ],
        },
      ],
    },
  },
};

export const 用語の競合: Story = {
  args: {
    filePath: "notes/humanities/10_言語学入門.tb",
    conflict: {
      code: 409,
      type: "identity_conflict",
      kind: "term",
      message: "更新前後の用語を自動で対応付けできません",
      conflicts: [
        {
          original: "構造主義",
          candidates: [
            { value: "構造言語学", similarity: 0.77 },
            { value: "構造主義言語学", similarity: 0.71 },
          ],
        },
      ],
    },
  },
};

export const モバイル表示: Story = {
  ...単文の候補を比較,
  globals: {
    viewport: { value: "mobile1" },
  },
};
