import type { Meta, StoryObj } from "@storybook/react-vite";

import { fixtureDetail1 } from "../../detail/fixture";
import Index from "./index";

const meta = {
  component: Index,
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loc: fixtureDetail1.location,
    tanbunId: fixtureDetail1.uid,
  },
};
