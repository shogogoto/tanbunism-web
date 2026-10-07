import type { Meta, StoryObj } from "@storybook/react-vite";
import ReviewXpProgress from "./ReviewXpProgress";

const meta = {
  title: "Features/Gamification/ReviewXpProgress",
  component: ReviewXpProgress,
  args: { currentXp: 31, requiredXp: 50, todayXp: 7 },
  decorators: [
    (Story) => (
      <div className="w-80 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReviewXpProgress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithToday: Story = {};
export const LeveledUpToday: Story = {
  args: { currentXp: 18, requiredXp: 150, todayXp: 68 },
};
export const NoReviewToday: Story = { args: { todayXp: 0 } };
