import type { Meta, StoryObj } from "@storybook/react-vite";
import { AuthProvider } from "~/features/auth/AuthProvider";
import Dashboard from ".";

const meta = {
  component: Dashboard,
  decorators: [
    (Story) => (
      <AuthProvider>
        <Story />
      </AuthProvider>
    ),
  ],
} satisfies Meta<typeof Dashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
