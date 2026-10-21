import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import {
  type GameCatalog,
  resolveCatalogTemplates,
} from "~/features/game/catalog";
import {
  sampleCatalog,
  sampleTemplateCatalog,
} from "~/features/game/catalog.fixtures";
import CatalogEditor from "./CatalogEditor";

export default {
  title: "Admin/GameCatalog",
  component: CatalogEditor,
  args: { kind: "skills" },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/admin/game/catalog", () =>
          HttpResponse.json({
            ...sampleCatalog,
            skills: [
              ...sampleCatalog.skills,
              {
                ...sampleCatalog.skills[1],
                id: "bubble",
                name: "バブル",
                effect: "buff",
                stat: "maxHp",
                amount_mode: "percent",
                amount: 100,
              },
            ],
          }),
        ),
        http.put("*/admin/game/catalog", async ({ request }) =>
          HttpResponse.json(await request.json()),
        ),
        http.post("*/admin/game/skills/preview", async ({ request }) => {
          const { catalog, document } = (await request.json()) as {
            catalog: GameCatalog;
            document: {
              format: string;
              version: number;
              skills: GameCatalog["skills"];
              skill_templates?: GameCatalog["skill_templates"];
            };
          };
          if (
            document.format !== "tanbunism.skills" ||
            ![1, 2, 3, 4, 5].includes(document.version) ||
            !Array.isArray(document.skills)
          ) {
            return HttpResponse.json(
              { detail: "スキルJSONの形式が正しくありません。" },
              { status: 422 },
            );
          }
          const skills = new Map(
            catalog.skills.map((skill) => [skill.id, skill]),
          );
          for (const skill of document.skills) skills.set(skill.id, skill);
          const templates = new Map(
            (catalog.skill_templates ?? []).map((template) => [
              template.id,
              template,
            ]),
          );
          for (const template of document.skill_templates ?? []) {
            templates.set(template.id, template);
          }
          return HttpResponse.json(
            resolveCatalogTemplates({
              ...catalog,
              skills: [...skills.values()],
              skill_templates: [...templates.values()],
            }),
          );
        }),
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r md:block">
          サイドバー
        </aside>
        <main className="min-w-0 flex-1">
          <Story />
        </main>
      </div>
    ),
  ],
} satisfies Meta<typeof CatalogEditor>;
export const Skills: StoryObj<typeof CatalogEditor> = {};
export const SharedTemplates: StoryObj<typeof CatalogEditor> = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/admin/game/catalog", () =>
          HttpResponse.json(sampleTemplateCatalog),
        ),
        http.put("*/admin/game/catalog", async ({ request }) =>
          HttpResponse.json(await request.json()),
        ),
      ],
    },
  },
};
export const Shop: StoryObj<typeof CatalogEditor> = { args: { kind: "shop" } };
export const Items: StoryObj<typeof CatalogEditor> = {
  args: { kind: "items" },
};
export const Enemies: StoryObj<typeof CatalogEditor> = {
  args: { kind: "enemies" },
};
