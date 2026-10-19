import type { Meta, StoryObj } from "@storybook/react-vite";

import { getDetailTanbunSentenceSentenceIdGetMockHandler } from "~/shared/generated/tanbun/tanbun.msw";
import MainView from "./MainView";
import { fixtureDetail1 } from "./fixture";
import Index from "./index";
import { oppositionFixture } from "./opposition.fixture";

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

export const Opposition: Story = {
  args: { id: "opposition" },
  render: () => <MainView detail={oppositionFixture()} />,
};
