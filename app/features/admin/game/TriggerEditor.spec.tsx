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

it("stages trigger deletion in the final column, allows undo, and removes shop listings on save", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json({
        ...catalog,
        shop: [
          ...catalog.shop,
          {
            trigger_id: "hp",
            trigger_variant_id: null,
            price: 100,
            enabled: true,
          },
        ],
      }),
    ),
  );
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  const table = screen.getByRole("table", { name: "ガンビットのトリガー" });
  expect(within(table).getAllByRole("columnheader").at(-1)).toHaveTextContent(
    "削除",
  );
  await user.click(within(row).getByRole("button", { name: "削除" }));
  expect(row).toHaveAttribute("data-pending-delete", "true");
  expect(row).toHaveClass("bg-muted");
  expect(saved).not.toHaveBeenCalled();
  await user.click(within(row).getByRole("button", { name: "削除を取り消す" }));
  expect(row).not.toHaveAttribute("data-pending-delete");
  await user.click(within(row).getByRole("button", { name: "削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(
    saved.mock.calls[0][0].triggers.map((t: { id: string }) => t.id),
  ).toEqual(["buff", "poison"]);
  expect(saved.mock.calls[0][0].shop).toEqual(catalog.shop);
  expect(saved.mock.calls[0][0].enemies).toEqual(catalog.enemies);
  expect(screen.queryByRole("row", { name: "HP条件" })).not.toBeInTheDocument();
  expect(screen.queryByText(/削除予約/)).not.toBeInTheDocument();
});

it("blocks deleting a trigger used by an enemy without changing its gambits", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json({
        ...catalog,
        enemies: [
          {
            ...catalog.enemies[0],
            gambits: [{ trigger_id: "hp", skill_id: "heal", enabled: true }],
          },
        ],
      }),
    ),
  );
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  await user.click(within(row).getByRole("button", { name: "削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("敵「ゴースト」");
  expect(saved).not.toHaveBeenCalled();
  expect(row).toHaveAttribute("data-pending-delete", "true");
});

it("retains pending trigger deletions after a failed save", async () => {
  server.use(
    http.put("*/admin/game/catalog", () =>
      HttpResponse.json({ detail: "保存失敗" }, { status: 500 }),
    ),
  );
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  await user.click(within(row).getByRole("button", { name: "削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByRole("alert");
  expect(row).toHaveAttribute("data-pending-delete", "true");
  expect(
    within(row).getByRole("button", { name: "削除を取り消す" }),
  ).toBeEnabled();
});

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

it("saves exact HP and MP percentage comparisons", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = within(await screen.findByRole("row", { name: "HP条件" }));
  await user.selectOptions(row.getByLabelText("比較"), "equal");
  expect(row.getByLabelText("比較")).toHaveValue("equal");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls.at(-1)?.[0].triggers[0].condition).toBe("hp_equal");
  await user.selectOptions(row.getByLabelText("判定する条件"), "mp");
  await user.selectOptions(row.getByLabelText("比較"), "equal");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls.at(-1)?.[0].triggers[0].condition).toBe("mp_equal");
});

it("defines stat thresholds, resource bases, and rank selection", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = within(await screen.findByRole("row", { name: "HP条件" }));
  expect(row.getByRole("option", { name: "未満" })).toBeInTheDocument();
  expect(row.queryByRole("option", { name: "以下" })).not.toBeInTheDocument();
  await user.selectOptions(row.getByLabelText("判定する条件"), "defense");
  expect(row.queryByLabelText("値の基準")).not.toBeInTheDocument();
  await user.selectOptions(row.getByLabelText("比較"), "lowest");
  expect(row.queryByLabelText("しきい値")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls.at(-1)?.[0].triggers[0]).toMatchObject({
    condition: "stat",
    stat: "defense",
    comparison: "lowest",
    stat_basis: "current",
  });
  await user.selectOptions(row.getByLabelText("判定する条件"), "hp");
  await user.selectOptions(row.getByLabelText("値の基準"), "maximum");
  await user.selectOptions(row.getByLabelText("比較"), "above");
  await user.clear(row.getByLabelText("しきい値"));
  await user.type(row.getByLabelText("しきい値"), "300");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls.at(-1)?.[0].triggers[0]).toMatchObject({
    condition: "stat",
    stat: "hp",
    comparison: "above",
    stat_basis: "maximum",
    threshold: 300,
  });
});

it("uses field-specific controls for target and state-presence variants", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "バフなし" });
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
  await user.click(panel.getByRole("button", { name: "この項目に切り替える" }));
  await user.selectOptions(panel.getByLabelText("変型の値"), "false");
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].triggers[1]).toMatchObject({
    variant_field: "state_present",
    variants: [{ value: false }],
  });
});

it("updates variation fields and limits when condition details change without rewriting existing variants", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = within(await screen.findByRole("row", { name: "HP条件" }));
  await user.click(row.getByRole("button", { name: "変型" }));
  let panel = within(screen.getByRole("dialog"));
  expect(
    within(panel.getByLabelText("変更する項目")).queryByRole("option", {
      name: "状態の有無",
    }),
  ).not.toBeInTheDocument();
  await user.click(panel.getByRole("button", { name: "変型を追加" }));
  expect(panel.getByLabelText("変型の値")).toHaveAttribute("max", "100");
  await user.keyboard("{Escape}");
  await user.selectOptions(row.getByLabelText("値の基準"), "current");
  await user.click(row.getByRole("button", { name: "変型 1" }));
  panel = within(screen.getByRole("dialog"));
  expect(panel.getByLabelText("変型の値")).toHaveAttribute("max", "100000");
  await user.keyboard("{Escape}");
  await user.selectOptions(row.getByLabelText("判定する条件"), "state");
  await user.click(row.getByRole("button", { name: "変型 1" }));
  panel = within(screen.getByRole("dialog"));
  const fields = within(panel.getByLabelText("変更する項目"));
  expect(
    fields.getByRole("option", { name: "状態スキル" }),
  ).toBeInTheDocument();
  expect(
    fields.queryByRole("option", { name: "値の基準" }),
  ).not.toBeInTheDocument();
  expect(
    fields.getByRole("option", { name: "しきい値（この条件では未使用）" }),
  ).toBeDisabled();
  expect(panel.getByLabelText("変型の値")).toHaveValue(30);
  expect(panel.getByRole("button", { name: "変型を追加" })).toBeDisabled();
  await user.selectOptions(
    panel.getByLabelText("変更する項目"),
    "state_skill_id",
  );
  await user.click(panel.getByRole("button", { name: "この項目に切り替える" }));
  expect(panel.getByRole("combobox", { name: "変型の値" })).toHaveValue(
    "poison_skill",
  );
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
  await user.click(manager.getByRole("button", { name: "＋ セットを追加" }));
  await user.clear(manager.getByLabelText("セット名"));
  await user.type(manager.getByLabelText("セット名"), "残量");
  await user.click(manager.getByRole("button", { name: "＋ 候補を追加" }));
  await user.clear(manager.getByLabelText("セットのサブ名"));
  await user.type(manager.getByLabelText("セットのサブ名"), "半分");
  await user.clear(manager.getByLabelText("セットの値"));
  await user.type(manager.getByLabelText("セットの値"), "50");
  await user.click(manager.getByRole("button", { name: "セットを反映" }));
  for (const name of ["HP条件", "MP条件"]) {
    const row = within(screen.getByRole("row", { name }));
    await user.click(row.getByRole("button", { name: "変型" }));
    const panel = within(screen.getByRole("dialog", { name: `${name}の変型` }));
    await user.click(panel.getByRole("checkbox", { name: "残量を使用" }));
    await user.click(
      panel.getByRole("button", { name: `${name}の組み合わせを追加` }),
    );
    const combination = within(
      screen.getByRole("dialog", { name: `${name}の組み合わせ` }),
    );
    await user.selectOptions(
      combination.getByLabelText("残量"),
      screen.getByRole("option", { name: "半分" }),
    );
    await user.click(
      combination.getByRole("button", { name: "この組み合わせを使う" }),
    );
    await user.keyboard("{Escape}");
  }
  await user.click(screen.getByRole("button", { name: "変型セットを管理" }));
  manager = within(
    screen.getByRole("dialog", { name: "ガンビットの変型セット" }),
  );
  expect(manager.getByRole("button", { name: "セットを削除" })).toBeDisabled();
  await user.clear(manager.getByLabelText("セットの値"));
  await user.type(manager.getByLabelText("セットの値"), "70");
  await user.click(manager.getByRole("button", { name: "セットを反映" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const payload = saved.mock.calls.at(-1)?.[0];
  expect(payload.trigger_variant_sets[0].values[0].value).toBe(70);
  expect(
    payload.triggers.map(
      (t: { variant_set_ids: string[] }) => t.variant_set_ids[0],
    ),
  ).toEqual([
    payload.trigger_variant_sets[0].id,
    payload.trigger_variant_sets[0].id,
  ]);
  expect(
    payload.triggers.every(
      (t: { variants: { resolved_values: { threshold: number } }[] }) =>
        t.variants[0].resolved_values.threshold === 70,
    ),
  ).toBe(true);
});

it("converts existing candidates to a shared set without changing IDs, then nests another variant", async () => {
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const row = await screen.findByRole("row", { name: "HP条件" });
  await user.click(within(row).getByRole("button", { name: "変型" }));
  let panel = within(screen.getByRole("dialog", { name: "HP条件の変型" }));
  await user.click(panel.getByRole("button", { name: "変型を追加" }));
  await user.clear(panel.getByLabelText("変型の副名"));
  await user.type(panel.getByLabelText("変型の副名"), "半分");
  await user.clear(panel.getByLabelText("変型の値"));
  await user.type(panel.getByLabelText("変型の値"), "50");
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const originalId = saved.mock.calls.at(-1)?.[0].triggers[0].variants[0].id;
  await user.click(within(row).getByRole("button", { name: "変型 1" }));
  panel = within(screen.getByRole("dialog", { name: "HP条件の変型" }));
  await user.click(panel.getByRole("button", { name: "セットとして登録" }));
  await user.click(panel.getByRole("checkbox", { name: "HP条件の変型を使用" }));
  expect(panel.getByRole("alert")).toHaveTextContent("親に設定されていません");
  expect(
    panel.getByRole("checkbox", { name: "HP条件の変型を使用" }),
  ).toBeChecked();
  await user.click(
    within(panel.getByRole("group", { name: "半分" })).getByRole("button", {
      name: "変型",
    }),
  );
  const child = within(
    screen.getByRole("dialog", { name: "HP条件（半分）の変型" }),
  );
  expect(
    child.getByRole("checkbox", { name: "HP条件の変型を使用" }),
  ).toBeDisabled();
  await user.selectOptions(child.getByLabelText("変更する項目"), "target");
  await user.click(child.getByRole("button", { name: "変型を追加" }));
  await user.clear(child.getByLabelText("変型の副名"));
  await user.type(child.getByLabelText("変型の副名"), "味方");
  await user.selectOptions(child.getByLabelText("変型の値"), "ally");
  await user.keyboard("{Escape}");
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const trigger = saved.mock.calls.at(-1)?.[0].triggers[0];
  expect(trigger.variants[0].id).toBe(originalId);
  expect(trigger.variants[0].variant_selections).toHaveLength(1);
  expect(trigger.variants[1]).toMatchObject({
    base_variant_id: originalId,
    resolved_name: "半分, 味方",
    resolved_values: { target: "ally", threshold: 50 },
  });
});
