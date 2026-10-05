import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import OrphanedTanbunManager from ".";

const meta = {
  title: "Admin/TanbunIntegrity",
  component: OrphanedTanbunManager,
  args: {
    kind: "misplaced",
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/admin/orphaned-tanbuns", () =>
          HttpResponse.json([
            {
              uid: "1309564ebe284ac39a14b39cda455f54",
              sentence: "意見を持っている",
              resource_uid: "resource-1",
              resource_name: "科学哲学の冒険",
              owner_email: "reader@example.com",
              reason: "missing_location",
              quiz_reference_count: 2,
              answer_reference_count: 4,
              relationship_count: 7,
            },
            {
              uid: "d4ac23e41ee64a4cab32528775556a54",
              sentence: "参照のない古い単文",
              resource_uid: "missing-resource",
              resource_name: null,
              owner_email: null,
              reason: "missing_resource",
              quiz_reference_count: 0,
              answer_reference_count: 0,
              relationship_count: 0,
            },
          ]),
        ),
        http.post("*/admin/orphaned-tanbuns/delete", () =>
          HttpResponse.json({
            deleted_count: 1,
            retired_count: 1,
            skipped_count: 0,
          }),
        ),
      ],
    },
  },
} satisfies Meta<typeof OrphanedTanbunManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AuditList: Story = {};
