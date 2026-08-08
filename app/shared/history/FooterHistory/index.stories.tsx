import type { Meta, StoryObj } from "@storybook/react-vite";
import type { HistoryItemType } from "~/shared/history/types";
import { FooterHistory } from "./index";

const meta = {
  component: FooterHistory,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  globals: {
    viewport: { value: "mobile1" },
  },
} satisfies Meta<typeof FooterHistory>;

export default meta;

type Story = StoryObj<typeof meta>;

const mockHistories: HistoryItemType[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  title: `Tanbun Title ${i}`,
  url: i % 2 === 0 ? "/tanbun/1" : "/user/1",
  timestamp: Date.now() - i * 1000 * 60 * 60 * 24,
}));

export const Default: Story = {
  args: {
    histories: mockHistories,
  },
};

export const Empty: Story = {
  args: {
    histories: [],
  },
};
