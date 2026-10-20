import type { Meta, StoryObj } from "@storybook/react-vite";
import Backbone from "./Backbone";
import { ResourceDetailProvider } from "./Context";
import { TraceMemoryProvider } from "./TraceMemory/Context";
import { resourceOppositionFixture } from "./opposition.fixture";

const meta = {
  component: Backbone,
  decorators: [
    (Story) => (
      <ResourceDetailProvider {...resourceOppositionFixture()}>
        <TraceMemoryProvider>
          <div className="markdown-body p-4">
            <Story />
          </div>
        </TraceMemoryProvider>
      </ResourceDetailProvider>
    ),
  ],
} satisfies Meta<typeof Backbone>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Opposition: Story = {
  args: { startId: resourceOppositionFixture().rootId },
};
