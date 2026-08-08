import type { Meta, StoryObj } from "@storybook/react-vite";
import { HistoryList } from "./index";
import type { HistoryItemType } from "./types";

const meta = {
  component: HistoryList,
} satisfies Meta<typeof HistoryList>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockHistory = (overrides: Partial<HistoryItemType>): HistoryItemType => ({
  id: Math.random(),
  title: "デフォルトの履歴タイトル",
  url: "example",
  timestamp: Date.now(),
  ...overrides,
});

export const Default: Story = {
  args: {
    histories: [
      mockHistory({ title: "user history", url: "user" }),
      mockHistory({ title: "tanbun history", url: "tanbun" }),
      mockHistory({ title: "search history", url: "search" }),
      mockHistory({ title: "resource history", url: "resource" }),
      mockHistory({ title: "other history", url: "other" }),
    ],
  },
};

export const Empty: Story = {
  args: { histories: [] },
};

const longLs = Array.from({ length: 100 }, (_, i) =>
  mockHistory({ title: `履歴項目 ${i + 1}` }),
);
export const LongList: Story = {
  args: { histories: longLs },
};

export const LongListMobile: Story = {
  args: { histories: longLs },
  globals: { viewport: { value: "mobile1" } },
};

export const LongNames: Story = {
  args: {
    histories: [
      mockHistory({
        title:
          "これは非常に長いタイトルの履歴項目です。テキストがどのように折り返されるか、または切り捨てられるかを確認するために使用されます。",
      }),
      mockHistory({
        title:
          "もう一つの非常に長い名前を持つ履歴項目で、UIの堅牢性をテストします。",
      }),
    ],
  },
};
