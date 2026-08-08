import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import QuizAchievement from ".";
import { monthlyQuizAchievementFixture } from "./fixture";

const meta = {
  title: "Achievement/QuizAchievement",
  component: QuizAchievement,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/user/achievement/quiz/monthly", ({ request }) => {
          const url = new URL(request.url);
          return HttpResponse.json(
            monthlyQuizAchievementFixture(
              Number(url.searchParams.get("year")),
              Number(url.searchParams.get("month")),
            ),
          );
        }),
      ],
    },
  },
} satisfies Meta<typeof QuizAchievement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MonthlyActivity: Story = {
  args: { initialMonth: { year: 2026, month: 8 } },
};
