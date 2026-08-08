import type { Meta, StoryObj } from "@storybook/react-vite";

import { PageProvider } from "~/shared/components/Pagenation/PageProvider";
import { fixtureSearchResult } from "./fixture";
import Index from "./index";

const meta = {
  component: Index,
  decorators: [
    (Story) => (
      <PageProvider pageSize={10}>
        <Story />
      </PageProvider>
    ),
  ],
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: fixtureSearchResult,
  },
};
