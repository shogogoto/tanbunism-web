import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { normalizeSkill } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import TriggerEditor from "./TriggerEditor";

const saved = vi.fn();
const catalog = {
  ...sampleCatalog,
  skills: [
    ...sampleCatalog.skills,
    normalizeSkill({
      id: "curse_skill",
      name: "カース",
      icon: "skull",
      effect: "ailment",
      target: "enemy",
      ailment: "curse",
      amount: 3,
      mp_cost: 2,
      enabled: true,
    }),
    normalizeSkill({
      id: "defense_up",
      name: "プロテクト",
      icon: "shield",
      effect: "buff",
      target: "self",
      stat: "defense",
      amount: 5,
      mp_cost: 2,
      enabled: true,
    }),
  ],
  triggers: [
    {
      id: "hp",
      name: "HP条件",
      condition: "hp_below",
      threshold: 30,
      enabled: true,
    },
    {
      id: "buff",
      name: "バフなし",
      condition: "buff_absent",
      threshold: 30,
      enabled: true,
    },
    {
      id: "poison",
      name: "毒条件",
      condition: "poisoned",
      threshold: 30,
      enabled: true,
    },
  ],
};
const server = setupServer(
  http.get("*/admin/game/catalog", () => HttpResponse.json(catalog)),
  http.put("*/admin/game/catalog", async ({ request }) => {
    const value = await request.json();
    saved(value);
    return HttpResponse.json(value);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

it("groups legacy states and edits comparison and state details without losing other definitions", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  expect(screen.getByRole("columnheader", { name: "詳細" })).toBeVisible();
  expect(
    screen.queryByRole("columnheader", { name: "初期値n" }),
  ).not.toBeInTheDocument();
  const hp = within(row);
  expect(hp.getByLabelText("判定する条件")).toHaveValue("hp");
  await user.selectOptions(hp.getByLabelText("比較"), "above");
  await user.clear(hp.getByLabelText("しきい値"));
  await user.type(hp.getByLabelText("しきい値"), "70");
  const buff = within(screen.getByRole("row", { name: "バフなし" }));
  expect(buff.getByLabelText("判定する条件")).toHaveValue("state");
  expect(buff.getByLabelText("状態の有無")).toHaveValue("false");
  const poison = within(screen.getByRole("row", { name: "毒条件" }));
  expect(poison.getByLabelText("判定する状態")).toHaveValue("");
  expect(
    poison.getByRole("option", { name: "旧設定：毒" }),
  ).toBeInTheDocument();
  expect(
    poison.getByRole("option", { name: "プロテクト" }),
  ).toBeInTheDocument();
  expect(
    poison.queryByRole("option", { name: "ファイア" }),
  ).not.toBeInTheDocument();
  expect(
    poison.queryByRole("option", { name: "ケアル" }),
  ).not.toBeInTheDocument();
  await user.selectOptions(
    poison.getByLabelText("判定する状態"),
    "curse_skill",
  );
  await user.selectOptions(poison.getByLabelText("状態の有無"), "false");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const payload = saved.mock.calls[0][0];
  expect(payload.triggers[0]).toMatchObject({
    condition: "hp_above",
    threshold: 70,
  });
  expect(payload.triggers[1]).toMatchObject({ condition: "buff_absent" });
  expect(payload.triggers[2]).toMatchObject({
    condition: "state",
    state_skill_id: "curse_skill",
    state_present: false,
  });
  expect(payload.items).toEqual(sampleCatalog.items);
});

it("switches detail inputs for MP, enemy count and unconditional rules", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = within(await screen.findByRole("row", { name: "HP条件" }));
  const condition = row.getByLabelText("判定する条件");
  await user.selectOptions(condition, "mp");
  expect(row.getByLabelText("比較")).toHaveValue("below");
  await user.selectOptions(condition, "enemy_count");
  expect(row.queryByLabelText("比較")).not.toBeInTheDocument();
  expect(row.getByText("体以上")).toBeVisible();
  await user.selectOptions(condition, "always");
  expect(row.queryByRole("spinbutton")).not.toBeInTheDocument();
});
