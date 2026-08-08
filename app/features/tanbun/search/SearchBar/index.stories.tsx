import type { Meta, StoryObj } from "@storybook/react-vite";

import { PageProvider } from "~/shared/components/Pagenation/PageProvider";
import { TanbunSearchProvider } from "../SearchContext";
import Index from "./index";

const meta = {
  component: Index,
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <PageProvider pageSize={10}>
        <TanbunSearchProvider>
          <Story />
        </TanbunSearchProvider>
      </PageProvider>
    ),
  ],
};
