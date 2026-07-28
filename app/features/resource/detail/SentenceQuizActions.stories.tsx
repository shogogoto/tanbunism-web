import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { ResourceDetailProvider } from "./Context";
import SentenceQuizActions from "./SentenceQuizActions";

const meta = {
  title: "Features/Resource/SentenceQuizActions",
  component: SentenceQuizActions,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <ResourceDetailProvider
          graph={null as never}
          uids={{}}
          terms={{}}
          rootId="resource-1"
          resource_info={null as never}
          sentenceQuizStatuses={
            new Map([
              [
                "sentence-1",
                {
                  sentence_id: "sentence-1",
                  total_quizzes: 3,
                  quiz_counts: { term2sent: 2, sent2term: 1 },
                },
              ],
            ])
          }
          refreshSentenceQuizStatuses={async () => {}}
        >
          <Story />
        </ResourceDetailProvider>
      </MemoryRouter>
    ),
  ],
  parameters: {
    msw: {
      handlers: [
        http.get("*/quiz/created", () =>
          HttpResponse.json({
            data: [
              {
                quiz_id: "quiz-1",
                statement: "「可換」に合う文を当ててください",
                options: {
                  "sentence-1": "演算順序を交換しても結果が変わらない。",
                  "sentence-2": "演算しても値を変化させない。",
                },
                correct: ["sentence-1"],
                created: "2026-07-27T00:00:00Z",
                no_correct_option: false,
              },
            ],
            total: 1,
          }),
        ),
        http.post("*/quiz", () =>
          HttpResponse.json({
            quiz_id: "quiz-new",
            statement: "「可換」に合う文を当ててください",
            options: {},
            correct: [],
            created: "2026-07-28T00:00:00Z",
            no_correct_option: false,
          }),
        ),
      ],
    },
  },
  args: {
    sentenceId: "sentence-1",
  },
} satisfies Meta<typeof SentenceQuizActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
