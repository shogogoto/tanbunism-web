import type { Meta, StoryObj } from "@storybook/react-vite";
import Backbone from "./Backbone";
import { ResourceDetailProvider } from "./Context";
import ResourceMeta from "./ResourceMeta";
import { TraceMemoryProvider } from "./TraceMemory/Context";
import { resourceMetadataFixture } from "./metadata.fixture";

const state = resourceMetadataFixture();
const meta = {
  component: Backbone,
  decorators: [
    (Story) => (
      <ResourceDetailProvider {...state}>
        <TraceMemoryProvider>
          <div className="markdown-body p-4">
            <ResourceMeta info={state.resource_info} />
            <Story />
          </div>
        </TraceMemoryProvider>
      </ResourceDetailProvider>
    ),
  ],
} satisfies Meta<typeof Backbone>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LegacyMetadata: Story = { args: { startId: state.rootId } };
