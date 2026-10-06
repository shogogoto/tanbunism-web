import type { Meta, StoryObj } from "@storybook/react-vite";
import ResourceShelf from "./ResourceShelf";
import { growthFixture, shelfFixture } from "./ResourceShelf.fixture";

const meta = {
  title: "Features/User/ResourceShelf",
  component: ResourceShelf,
  args: {
    namespace: shelfFixture,
    growth: growthFixture,
    own: true,
    loading: false,
    onRetry: () => {},
  },
} satisfies Meta<typeof ResourceShelf>;
export default meta;
type Story = StoryObj<typeof meta>;
export const OwnBooks: Story = {};
export const PublicBooks: Story = { args: { own: false } };
export const Loading: Story = { args: { growth: undefined, loading: true } };
