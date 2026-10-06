import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, userEvent, within } from "storybook/test";
import { AuthProvider } from "~/features/auth/AuthProvider";
import ReviewSettingsManager from "./ReviewSettingsManager";
import { defaultSettings } from "./settings";

const meta = {
  component: ReviewSettingsManager,
  decorators: [
    (Story) => (
      <AuthProvider>
        <div className="p-3">
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
  parameters: {
    msw: {
      handlers: [
        http.get("*/user/me", () =>
          HttpResponse.json({
            uid: "review-story",
            email: "reader@example.com",
            username: "reader",
            is_active: true,
            is_verified: true,
            is_superuser: false,
          }),
        ),
        http.get("*/review/settings", () =>
          HttpResponse.json([
            defaultSettings,
            {
              ...defaultSettings,
              id: "philosophy",
              name: "哲学を少しずつ",
              tanbun_count: 10,
              quiz_count: 5,
              resource_ids: ["11111111-1111-4111-8111-111111111111"],
              priority: "weak",
            },
          ]),
        ),
        http.get("*/namespace", () =>
          HttpResponse.json({
            g: {
              nodes: [
                {
                  id: {
                    uid: "11111111-1111-4111-8111-111111111111",
                    name: "科学哲学の冒険 — 科学的な知識と推論の関係を整理して復習するための長い読書メモタイトル",
                    authors: ["戸田山和久"],
                    published: null,
                  },
                },
                {
                  id: {
                    uid: "22222222-2222-4222-8222-222222222222",
                    name: "論理学入門",
                    authors: [],
                    published: null,
                  },
                },
              ],
              edges: [],
            },
            stats: {},
            roots_: {},
          }),
        ),
        http.put("*/review/settings/:id", async ({ request, params }) =>
          HttpResponse.json({
            ...((await request.json()) as object),
            id: params.id,
          }),
        ),
        http.post("*/review/settings", async ({ request }) =>
          HttpResponse.json({
            ...((await request.json()) as object),
            id: "new-setting",
          }),
        ),
        http.delete(
          "*/review/settings/:id",
          () => new HttpResponse(null, { status: 204 }),
        ),
        http.post(
          "*/review/settings/:id/rebuild",
          () => new HttpResponse(null, { status: 204 }),
        ),
      ],
    },
  },
} satisfies Meta<typeof ReviewSettingsManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Edit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "哲学を少しずつを編集" }),
    );
    const dialog = within(document.body).getByRole("dialog");
    await expect(dialog).toBeVisible();
    await within(dialog).findByRole("checkbox", {
      name: /科学哲学の冒険 — 科学的な知識/,
    });
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
  },
};
