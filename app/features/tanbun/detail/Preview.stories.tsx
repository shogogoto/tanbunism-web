import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { getDetailTanbunSentenceSentenceIdGetMockHandler } from "~/shared/generated/tanbun/tanbun.msw";
import { TanbunPreviewDialog } from "./Preview";
import { fixtureDetail1 } from "./fixture";

const meta = {
  component: TanbunPreviewDialog,
  args: { target: { sentenceId: fixtureDetail1.uid }, onClose: fn() },
  parameters: {
    msw: {
      handlers: [
        getDetailTanbunSentenceSentenceIdGetMockHandler([fixtureDetail1]),
      ],
    },
  },
} satisfies Meta<typeof TanbunPreviewDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
