import type { Meta, StoryObj } from "@storybook/react-vite";

import { getDetailTanbunSentenceSentenceIdGetMockHandler } from "~/shared/generated/tanbun/tanbun.msw";
import { fixtureDetail1 } from "./fixture";
import Index from "./index";

const meta = {
  component: Index,
  parameters: {
    msw: {
      handlers: [
        getDetailTanbunSentenceSentenceIdGetMockHandler([fixtureDetail1]),
      ],
    },
  },
} satisfies Meta<typeof Index>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { id: "d9442f16-504e-4284-bac1-cc0be01b812f" },
};
