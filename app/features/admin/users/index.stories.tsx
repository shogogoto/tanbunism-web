import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import AdminUserManager from ".";

const meta = {
  title: "Admin/Users",
  component: AdminUserManager,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/admin/users", () =>
          HttpResponse.json([
            {
              uid: "admin-1",
              email: "owner@example.com",
              display_name: "運営者",
              username: "owner",
              is_active: true,
              is_superuser: true,
              created: "2026-01-01T00:00:00Z",
              resource_count: 24,
            },
            {
              uid: "user-1",
              email: "reader@example.com",
              display_name: "読書ユーザー",
              username: "reader",
              is_active: true,
              is_superuser: false,
              created: "2026-09-01T00:00:00Z",
              resource_count: 3,
            },
            {
              uid: "user-2",
              email: "stopped@example.com",
              display_name: null,
              username: "stopped",
              is_active: false,
              is_superuser: false,
              created: "2026-08-01T00:00:00Z",
              resource_count: 1,
            },
          ]),
        ),
        http.get("*/admin/users/:userId/resources", () =>
          HttpResponse.json([
            {
              uid: "resource-1",
              name: "# 科学哲学の冒険",
              updated_at: "2026-09-20T00:00:00Z",
              sentence_count: 282,
            },
          ]),
        ),
        http.get("*/admin/resources/:resourceId/deletion-impact", () =>
          HttpResponse.json({
            resource_uid: "resource-1",
            resource_name: "# 科学哲学の冒険",
            owner_uid: "user-1",
            owner_email: "reader@example.com",
            sentence_count: 282,
            term_count: 63,
            quiz_count: 8,
            answer_count: 24,
            retiring_sentence_count: 14,
            deleting_sentence_count: 268,
          }),
        ),
      ],
    },
  },
} satisfies Meta<typeof AdminUserManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserList: Story = {};
