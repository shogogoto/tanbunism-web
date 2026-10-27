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
      id: "poison_skill",
      name: "ポイズン",
      icon: "skull",
      effect: "ailment",
      target: "enemy",
      ailment: "poison",
      amount: 3,
      mp_cost: 2,
      enabled: true,
    }),
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
      condition: "state",
      state_skill_id: "defense_up",
      state_present: false,
      threshold: 30,
      enabled: true,
    },
    {
      id: "poison",
      name: "毒条件",
      condition: "state",
      state_skill_id: "poison_skill",
      state_present: true,
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

it("selects state skills and edits comparison details without legacy state options", async () => {
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
  expect(poison.getByLabelText("判定する状態")).toHaveValue("poison_skill");
  expect(
    within(poison.getByLabelText("判定する状態")).queryByRole("option", {
      name: /旧設定/,
    }),
  ).not.toBeInTheDocument();
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
  expect(payload.triggers[1]).toMatchObject({
    condition: "state",
    state_skill_id: "defense_up",
    state_present: false,
  });
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

it("saves targets and named trigger variants without expanding table rows", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  await user.selectOptions(within(row).getByLabelText("対象"), "ally");
  await user.click(within(row).getByRole("button", { name: "変型" }));
  const dialog = screen.getByRole("dialog", { name: "HP条件の変型" });
  expect(row).toHaveClass("bg-primary/10");
  await user.click(within(dialog).getByRole("button", { name: "変型を追加" }));
  const name = within(dialog).getByLabelText("変型の副名");
  await user.clear(name);
  await user.type(name, "半分");
  const value = within(dialog).getByLabelText("変型の値");
  await user.clear(value);
  await user.type(value, "50");
  await user.keyboard("{Escape}");
  expect(row).not.toHaveClass("bg-primary/10");
  expect(within(row).getByRole("button", { name: "変型 1" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].triggers[0]).toMatchObject({
    target: "ally",
    variants: [{ name: "半分", value: 50 }],
  });
  expect(saved.mock.calls[0][0].triggers).toHaveLength(3);
});

it("uses field-specific controls for target and state-presence variants", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  await user.click(within(row).getByRole("button", { name: "変型" }));
  const panel = within(screen.getByRole("dialog"));
  await user.selectOptions(panel.getByLabelText("変更する項目"), "target");
  await user.click(panel.getByRole("button", { name: "変型を追加" }));
  await user.selectOptions(panel.getByLabelText("変型の値"), "ally");
  expect(panel.getByLabelText("変型の値")).toHaveValue("ally");
  await user.selectOptions(
    panel.getByLabelText("変更する項目"),
    "state_present",
  );
  await user.click(panel.getByRole("button", { name: "変型を追加" }));
  await user.selectOptions(panel.getByLabelText("変型の値"), "false");
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].triggers[0]).toMatchObject({
    variant_field: "state_present",
    variants: [{ value: false }],
  });
});

it("shares a variant set across triggers and propagates later edits", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json({
        ...catalog,
        triggers: [
          catalog.triggers[0],
          {
            ...catalog.triggers[0],
            id: "mp",
            name: "MP条件",
            condition: "mp_below",
          },
        ],
      }),
    ),
  );
  const user = userEvent.setup();
  render(<TriggerEditor />);
  await screen.findByRole("row", { name: "HP条件" });
  await user.click(screen.getByRole("button", { name: "変型セットを管理" }));
  let manager = within(
    screen.getByRole("dialog", { name: "ガンビットの変型セット" }),
  );
  await user.click(manager.getByRole("button", { name: "セットを追加" }));
  await user.clear(manager.getByLabelText("セット名"));
  await user.type(manager.getByLabelText("セット名"), "残量");
  await user.click(manager.getByRole("button", { name: "変型を追加" }));
  await user.clear(manager.getByLabelText("変型の副名"));
  await user.type(manager.getByLabelText("変型の副名"), "半分");
  await user.clear(manager.getByLabelText("変型の値"));
  await user.type(manager.getByLabelText("変型の値"), "50");
  await user.click(manager.getByRole("button", { name: "反映" }));
  for (const name of ["HP条件", "MP条件"]) {
    const row = within(screen.getByRole("row", { name }));
    await user.click(row.getByRole("button", { name: "変型" }));
    const panel = within(screen.getByRole("dialog", { name: `${name}の変型` }));
    await user.selectOptions(
      panel.getByLabelText("変型セット"),
      screen.getByRole("option", { name: "残量" }),
    );
    expect(panel.getByLabelText("変型の値")).toHaveValue(50);
    expect(panel.getByLabelText("変型の値")).toBeDisabled();
    await user.keyboard("{Escape}");
  }
  await user.click(screen.getByRole("button", { name: "変型セットを管理" }));
  manager = within(
    screen.getByRole("dialog", { name: "ガンビットの変型セット" }),
  );
  expect(manager.getByRole("button", { name: "残量を削除" })).toBeDisabled();
  await user.clear(manager.getByLabelText("変型の値"));
  await user.type(manager.getByLabelText("変型の値"), "70");
  await user.click(manager.getByRole("button", { name: "反映" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const payload = saved.mock.calls.at(-1)?.[0];
  expect(payload.trigger_variant_sets[0].values[0].value).toBe(70);
  expect(
    payload.triggers.map((t: { variant_set_id: string }) => t.variant_set_id),
  ).toEqual([
    payload.trigger_variant_sets[0].id,
    payload.trigger_variant_sets[0].id,
  ]);
  expect(
    payload.triggers.every(
      (t: { variants: { value: number }[] }) => t.variants[0].value === 70,
    ),
  ).toBe(true);
});
