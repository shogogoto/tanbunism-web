import type { Meta, StoryObj } from "@storybook/react-vite";
import { TanbunSearchProvider } from "../../SearchContext";
import Index from "./index";

const meta = {
  component: Index,
  decorators: [
    (Story) => (
      <TanbunSearchProvider>
        <Story />
      </TanbunSearchProvider>
    ),
  ],
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
