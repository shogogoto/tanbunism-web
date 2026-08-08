import type { Meta, StoryObj } from "@storybook/react-vite";

import { fixtureDetail1 } from "../fixture";
import { graphForView } from "../util";
import Index from "./index";

const meta = {
  component: Index,
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

const { rootId, g, kn } = graphForView(fixtureDetail1);

export const Default: Story = {
  args: { startId: rootId, g, kn },
};
