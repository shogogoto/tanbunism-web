import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import GambitEditor from "./GambitEditor";
import { sampleCatalog } from "./catalog.fixtures";
import { type GameSave, newSave } from "./domain";

const catalog = {
  ...sampleCatalog,
  triggers: [
    {
      id: "hp",
      name: "HP条件",
      condition: "hp_below",
      threshold: 30,
      target: "ally",
      enabled: true,
      variant_field: "threshold",
      variants: [
        { id: "half", name: "半分", value: 50 },
        { id: "low", name: "瀕死", value: 10 },
      ],
    },
    {
      id: "always",
      name: "敵：いつでも",
      condition: "always",
      threshold: 30,
      target: "enemy",
      enabled: true,
    },
    {
      id: "unsold",
      name: "未入手の条件",
      condition: "always",
      threshold: 30,
      target: "enemy",
      enabled: true,
    },
  ],
};
const saved = vi.fn();
const onSaved = vi.fn();
const server = setupServer(
  http.get("*/game/gambits/capacity", () =>
    HttpResponse.json({ slots: 2, next_level: 10 }),
  ),
  http.get("*/game/catalog", () => HttpResponse.json(catalog)),
  http.put("*/game/gambits", async ({ request }) => {
    saved(await request.json());
    return HttpResponse.json({ revision: 5, save: newSave() });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());
function ownedSave(): GameSave & { economy: NonNullable<GameSave["economy"]> } {
  const save = newSave();
  return {
    ...save,
    economy: {
      gold: 0,
      inventory: { healing_potion: 1 },
      weapon: null,
      weapon_attack: 0,
      ...save.economy,
      unlocked_triggers: ["hp", "hp:half", "always"],
    },
    gambits: [
      {
        enabled: true,
        condition: "hp_below",
        threshold: 30,
        trigger_id: "hp",
        trigger_variant_id: null,
        action: "skill",
        definition_id: "heal",
      },
    ],
  };
}
function setup(save = ownedSave(), disabled = false) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <GambitEditor
        revision={4}
        save={save}
        disabled={disabled}
        onSaved={onSaved}
      />
    </SWRConfig>,
  );
  return userEvent.setup();
}

it("only combines owned triggers and skills without editable condition details", async () => {
  const user = setup();
  const trigger = await screen.findByRole("combobox", { name: "トリガー" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  expect(
    within(trigger)
      .getAllByRole("option")
      .map((o) => o.textContent),
  ).toEqual(["トリガーを選択", "HP条件", "HP条件（半分）", "敵：いつでも"]);
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("対象")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("行動")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("変型")).not.toBeInTheDocument();
  await user.selectOptions(trigger, "hp:half");
  expect(screen.getByLabelText("条件の詳細")).toHaveTextContent("50");
  await user.selectOptions(
    screen.getByRole("combobox", { name: "スキル" }),
    "skill:fire",
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0]).toEqual({
    revision: 4,
    rules: [
      {
        enabled: true,
        trigger_id: "hp",
        trigger_variant_id: "half",
        action: "skill",
        definition_id: "fire",
      },
    ],
  });
});

it("does not allow adding rules without owned triggers, even for unsold definitions", async () => {
  const save = ownedSave();
  save.gambits = [];
  save.economy.unlocked_triggers = [];
  setup(save);
  expect(
    await screen.findByText(/トリガーを入手すると設定できます/),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "条件を追加" })).toBeDisabled();
  expect(screen.getByLabelText("デフォルトガンビット")).toHaveTextContent(
    "戦う",
  );
});

it("offers an owned variant without granting its base or sibling", async () => {
  const save = ownedSave();
  save.gambits = [];
  save.economy.unlocked_triggers = ["hp:half"];
  const user = setup(save);
  const add = await screen.findByRole("button", { name: "条件を追加" });
  await waitFor(() => expect(add).toBeEnabled());
  await user.click(add);
  const trigger = screen.getByRole("combobox", { name: "トリガー" });
  expect(trigger).toHaveValue("hp:half");
  expect(
    within(trigger).queryByRole("option", { name: "HP条件" }),
  ).not.toBeInTheDocument();
  expect(
    within(trigger).queryByRole("option", { name: "HP条件（瀕死）" }),
  ).not.toBeInTheDocument();
});

it("only offers granted skills and items actually owned by this player", async () => {
  const save = ownedSave();
  save.economy.inventory = {};
  setup(save);
  const skills = await screen.findByRole("combobox", { name: "スキル" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  expect(
    within(skills).getByRole("option", { name: /ファイア/ }),
  ).toBeVisible();
  expect(
    within(skills).queryByRole("option", { name: /薬の回復/ }),
  ).not.toBeInTheDocument();
  expect(
    within(skills).queryByRole("option", { name: /回復薬/ }),
  ).not.toBeInTheDocument();
});

it("reorders combinations and saves owned item skills without condition overrides", async () => {
  const user = setup();
  const add = screen.getByRole("button", { name: "条件を追加" });
  await waitFor(() => expect(add).toBeEnabled());
  await user.click(add);
  const row = within(screen.getByRole("region", { name: "ガンビット 2" }));
  await user.selectOptions(
    row.getByRole("combobox", { name: "トリガー" }),
    "always",
  );
  await user.selectOptions(
    row.getByRole("combobox", { name: "スキル" }),
    "item:healing_potion",
  );
  await user.click(screen.getByRole("button", { name: "2番を上へ" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].rules).toEqual([
    {
      enabled: true,
      trigger_id: "always",
      trigger_variant_id: null,
      action: "item",
      definition_id: "healing_potion",
    },
    {
      enabled: true,
      trigger_id: "hp",
      trigger_variant_id: null,
      action: "skill",
      definition_id: "heal",
    },
  ]);
});

it("only offers specialty skills from equipped specialties with enabled access", async () => {
  server.use(
    http.get("*/game/catalog", () =>
      HttpResponse.json({
        ...catalog,
        specialty_skills: [{ skill_id: "heal", enabled: true }],
      }),
    ),
  );
  const save = ownedSave();
  save.specialties = [
    {
      id: "equipped",
      name: "治療",
      resource_ids: ["book"],
      skill_id: "heal",
      equipped: true,
    },
    {
      id: "unequipped",
      name: "未装備",
      resource_ids: ["other"],
      skill_id: "heal",
      equipped: false,
    },
    {
      id: "locked",
      name: "未解放",
      resource_ids: ["another"],
      skill_id: "fire",
      equipped: true,
    },
  ];
  const user = setup(save);
  const skills = await screen.findByRole("combobox", { name: "スキル" });
  expect(
    await within(skills).findByRole("option", { name: "治療：ケアル" }),
  ).toBeVisible();
  expect(
    within(skills).queryByRole("option", { name: /未装備|未解放/ }),
  ).not.toBeInTheDocument();
  await user.selectOptions(skills, "specialty:equipped");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].rules[0]).toMatchObject({
    action: "specialty",
    definition_id: "equipped",
  });
});

it("prevents resaving an unowned previous rule until repaired or removed", async () => {
  const save = ownedSave();
  save.economy.unlocked_triggers = ["always"];
  const user = setup(save);
  const trigger = await screen.findByRole("combobox", { name: "トリガー" });
  expect(await screen.findByText(/選び直すか/)).toBeVisible();
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  await user.selectOptions(trigger, "always");
  expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
});

it("preserves chosen combinations after a stale save", async () => {
  server.use(
    http.put("*/game/gambits", () =>
      HttpResponse.json(
        { detail: "状態が更新されています。" },
        { status: 409 },
      ),
    ),
  );
  const user = setup();
  const trigger = await screen.findByRole("combobox", { name: "トリガー" });
  await user.selectOptions(trigger, "always");
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "状態が更新されています。",
  );
  expect(trigger).toHaveValue("always");
});

it("disables editing and saving during battle", async () => {
  setup(ownedSave(), true);
  expect(
    await screen.findByRole("combobox", { name: "トリガー" }),
  ).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "スキル" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "条件を追加" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
});

it("limits a new player to the server-provided slot count", async () => {
  server.use(
    http.get("*/game/gambits/capacity", () =>
      HttpResponse.json({ slots: 1, next_level: 5 }),
    ),
  );
  setup();
  expect(await screen.findByText("ガンビット 1/1枠 · 次はLv.5")).toBeVisible();
  expect(screen.getByRole("button", { name: "条件を追加" })).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
});
