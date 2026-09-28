import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ImportPreviewRow } from "./ImportPreviewRow";

const meta = {
  title: "読書メモ/取り込み前の確認",
  component: ImportPreviewRow,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-3xl divide-y rounded-lg border bg-background text-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    path: "notes/humanities/8_科学哲学の冒険.tb",
    onOpenConflict: fn(),
  },
} satisfies Meta<typeof ImportPreviewRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const 更新可能: Story = {
  args: {
    state: {
      status: "ready",
      resolutions: [],
      preview: {
        resource_id: "resource-id",
        is_new: false,
        sentences_added: 12,
        sentences_removed: 3,
        sentences_updated: 5,
        terms_added: 2,
        terms_removed: 0,
        terms_updated: 1,
      },
    },
  },
};

export const 新規Resource: Story = {
  args: {
    path: "notes/business/新しい読書メモ.tb",
    state: {
      status: "ready",
      resolutions: [],
      preview: {
        resource_id: null,
        is_new: true,
        sentences_added: 48,
        sentences_removed: 0,
        sentences_updated: 0,
        terms_added: 11,
        terms_removed: 0,
        terms_updated: 0,
      },
    },
  },
};

export const 競合あり: Story = {
  args: {
    state: {
      status: "conflict",
      resolutions: [],
      conflict: {
        code: 409,
        type: "identity_conflict",
        kind: "sentence",
        message: "更新先を一意に決められません",
        conflicts: [
          {
            original: "以前の単文",
            candidates: [{ value: "書き直した単文", similarity: 0.86 }],
          },
        ],
      },
    },
  },
};

export const Parseエラー: Story = {
  args: {
    state: {
      status: "error",
      resolutions: [],
      message: "現在の記法で読めない行があります。",
      details:
        "12行目: 見出しの配下になるよう、この行をインデントしてください。",
    },
  },
};

export const 変更なし: Story = {
  args: {
    skipped: true,
  },
};

export const モバイル表示: Story = {
  ...更新可能,
  globals: {
    viewport: { value: "mobile1" },
  },
};
