import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { defaultElements } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import CatalogEditor from "./CatalogEditor";
import ElementEditor from "./ElementEditor";

const saved = vi.fn();
const server = setupServer(
  http.get("*/admin/game/catalog", () =>
    HttpResponse.json({ ...sampleCatalog, elements: defaultElements }),
  ),
  http.put("*/admin/game/catalog", async ({ request }) => {
    const value = await request.json();
    saved(value);
    return HttpResponse.json(value);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  saved.mockClear();
});
afterAll(() => server.close());

it("edits element metadata and adds definitions while preserving the catalog", async () => {
  const user = userEvent.setup();
  render(<ElementEditor />);
  const row = await screen.findByRole("row", { name: "炎" });
  await user.clear(within(row).getByLabelText("属性名"));
  await user.type(within(row).getByLabelText("属性名"), "火炎");
  await user.click(within(row).getByLabelText("有効"));
  await user.click(screen.getByRole("button", { name: "属性を追加" }));
  expect(screen.getByRole("row", { name: "新しい属性" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0]).toMatchObject({
    skills: sampleCatalog.skills,
    items: sampleCatalog.items,
    enemies: sampleCatalog.enemies,
    elements: expect.arrayContaining([
      expect.objectContaining({ id: "fire", name: "火炎", enabled: false }),
    ]),
  });
});

it("sets skill element independently of templates and configures attribute buffs", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  const row = await screen.findByRole("row", { name: "ファイア" });
  await user.selectOptions(within(row).getByLabelText("属性"), "fire");
  await user.click(
    screen.getByRole("button", { name: "効果テンプレートを追加" }),
  );
  const template = screen.getByRole("row", { name: "新しい効果" });
  await user.selectOptions(within(template).getByLabelText("種別"), "status");
  await user.selectOptions(
    within(template).getByLabelText("対象ステータス"),
    "属性耐性",
  );
  await user.selectOptions(
    within(template).getByLabelText("補正対象属性"),
    "ice",
  );
  expect(
    within(template).getByRole("option", { name: "属性威力" }),
  ).toBeInTheDocument();
  expect(
    within(template).queryByRole("option", { name: /与ダメージ|被ダメージ/ }),
  ).not.toBeInTheDocument();
  expect(within(template).getByLabelText("状態の値の指定")).toHaveValue(
    "percent",
  );
  await user.clear(within(template).getByLabelText("状態の値"));
  await user.type(within(template).getByLabelText("状態の値"), "25");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const payload = saved.mock.calls[0][0];
  expect(
    payload.skills.find((skill: { id: string }) => skill.id === "fire").element,
  ).toBe("fire");
  expect(
    payload.skill_templates.find(
      (value: { name: string }) => value.name === "新しい効果",
    ),
  ).toMatchObject({
    effect: "buff",
    stat: "damageTaken",
    affected_element: "ice",
    amount_mode: "percent",
    amount: 25,
  });
  expect(
    payload.skill_templates.every((value: object) => !("element" in value)),
  ).toBe(true);
});

it("cycles per-element columns through neutral, weak and resistant and persists them", async () => {
  const user = userEvent.setup();
  const view = render(<CatalogEditor kind="enemies" />);
  await user.click(
    await screen.findByRole("button", { name: "ゴーストの炎：中立" }),
  );
  await user.click(screen.getByRole("button", { name: "ゴーストの炎：弱点" }));
  expect(
    screen.getByRole("button", { name: "ゴーストの炎：耐性" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "ゴーストの光：中立" }));
  await user.click(screen.getByRole("button", { name: "ゴーストの氷：中立" }));
  await user.click(screen.getByRole("button", { name: "ゴーストの氷：弱点" }));
  screen.getByRole("button", { name: "ゴーストの氷：耐性" }).focus();
  await user.keyboard(" ");
  expect(
    screen.getByRole("button", { name: "ゴーストの氷：中立" }),
  ).toBeVisible();
  for (const element of defaultElements)
    expect(
      screen.getByRole("columnheader", { name: element.name }),
    ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const payload = saved.mock.calls[0][0];
  expect(payload.enemies[0].weaknesses).toEqual(["light"]);
  expect(payload.enemies[0].resistances).toEqual(["fire"]);
  view.unmount();
  server.use(
    http.get("*/admin/game/catalog", () => HttpResponse.json(payload)),
  );
  render(<CatalogEditor kind="enemies" />);
  expect(
    await screen.findByRole("button", { name: "ゴーストの炎：耐性" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "ゴーストの光：弱点" }),
  ).toBeVisible();
});
