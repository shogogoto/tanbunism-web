import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import * as battleSound from "~/features/game/battleSound";
import {
  sampleCatalog,
  sampleTemplateCatalog,
} from "~/features/game/catalog.fixtures";
import CatalogEditor from "./CatalogEditor";
import * as skillFiles from "./skillFiles";

const saved = vi.fn();
const server = setupServer(
  http.get("*/admin/game/catalog", () => HttpResponse.json(sampleCatalog)),
  http.put("*/admin/game/catalog", async ({ request }) => {
    const value = await request.json();
    saved(value);
    return HttpResponse.json(value);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  vi.spyOn(battleSound, "playSkillSound").mockImplementation(() => undefined);
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

it("uses two sortable tables with exactly six skill columns and migrates legacy skills", async () => {
  render(<CatalogEditor kind="skills" />);
  const skills = await screen.findByRole("table", { name: "スキル一覧" });
  expect(screen.getAllByRole("table")).toHaveLength(2);
  expect(
    within(skills)
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.replace(" ↕", "")),
  ).toEqual(["名前", "効果テンプレート", "消費MP", "演出", "有効", "削除"]);
  const row = within(skills).getByRole("row", { name: "ファイア" });
  expect(within(row).getByLabelText("効果テンプレート 1")).toHaveValue(
    "effect_fire",
  );
  expect(screen.getByRole("row", { name: "ファイアの効果" })).toBeVisible();
  expect(within(row).queryByLabelText("攻撃倍率")).not.toBeInTheDocument();
  const sort = within(skills).getByRole("button", { name: "消費MP ↕" });
  await userEvent.click(sort);
  expect(sort.closest("th")).toHaveAttribute("aria-sort", "ascending");
  await userEvent.click(sort);
  expect(sort.closest("th")).toHaveAttribute("aria-sort", "descending");
  const templates = screen.getByRole("table", { name: "効果テンプレート一覧" });
  expect(
    within(templates)
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.replace(" ↕", "")),
  ).toEqual([
    "名前",
    "対象数",
    "計算",
    "種別",
    "詳細",
    "タイプ",
    "効果",
    "削除",
  ]);
  expect(
    within(templates).queryByRole("combobox", { name: /^対象$/ }),
  ).not.toBeInTheDocument();
  const nameSort = within(templates).getByRole("button", { name: "名前 ↕" });
  await userEvent.click(nameSort);
  expect(nameSort.closest("th")).toHaveAttribute("aria-sort", "ascending");
});

it("shares effect edits while retaining independent skill MP and multiple references", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json(sampleTemplateCatalog),
    ),
  );
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  const fire = await screen.findByRole("row", { name: "ファイア" });
  const template = screen.getByRole("row", { name: "初級単体魔法" });
  expect(within(template).queryByLabelText("消費MP")).not.toBeInTheDocument();
  expect(within(template).getByRole("button", { name: "削除" })).toBeDisabled();
  fireEvent.change(
    within(template).getByLabelText("正答効果の値", { exact: true }),
    { target: { value: "2" } },
  );
  fireEvent.change(within(fire).getByLabelText("消費MP"), {
    target: { value: "7" },
  });
  await user.click(within(fire).getByRole("button", { name: "効果を追加" }));
  expect(within(fire).getAllByRole("combobox")).toHaveLength(2);
  expect(within(fire).getByLabelText("効果 1を外す")).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const payload = saved.mock.calls[0][0];
  expect(
    payload.skills.find((s: { id: string }) => s.id === "fire"),
  ).toMatchObject({
    mp_cost: 7,
    template_ids: expect.arrayContaining(["basic_spell"]),
    multiplier: 2,
  });
  expect(
    payload.skills.find((s: { id: string }) => s.id === "thunder"),
  ).toMatchObject({ mp_cost: 3, multiplier: 2 });
  expect(payload.skill_templates[0]).not.toHaveProperty("mp_cost");
});

it("does not remove the last effect and keeps consumed MP on the skill", async () => {
  render(<CatalogEditor kind="skills" />);
  const fire = await screen.findByRole("row", { name: "ファイア" });
  expect(within(fire).getByLabelText("効果 1を外す")).toBeDisabled();
  expect(within(fire).getByLabelText("消費MP")).toBeEnabled();
});

it("keeps the default attack free and undeletable but allows animation editing", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json(sampleTemplateCatalog),
    ),
  );
  render(<CatalogEditor kind="skills" />);
  const normal = await screen.findByRole("row", { name: "戦う" });
  expect(
    within(normal).getByRole("button", { name: "戦うの演出を選ぶ" }),
  ).toBeEnabled();
  for (const label of ["消費MP", "有効", "効果テンプレート 1"])
    expect(within(normal).getByLabelText(label)).toBeDisabled();
  expect(within(normal).getByRole("button", { name: "削除" })).toBeDisabled();
});

it("previews and applies animation and SE together without saving other skills", async () => {
  const play = vi
    .spyOn(battleSound, "playSkillSound")
    .mockImplementation(() => undefined);
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: "ファイア" });
  expect(within(row).queryByLabelText("SE")).not.toBeInTheDocument();
  await user.click(
    within(row).getByRole("button", { name: "ファイアの演出を選ぶ" }),
  );
  const gallery = screen.getByRole("dialog", { name: "ファイアの演出" });
  await user.click(
    within(gallery).getByRole("button", { name: "炎をプレビュー" }),
  );
  expect(
    within(gallery).getByLabelText("組み合わせプレビュー").parentElement,
  ).toHaveTextContent("SE：自動（炎の着弾）");
  await user.click(
    within(gallery).getByRole("button", { name: "炎魔法 2のSEを試聴" }),
  );
  expect(play).toHaveBeenCalledWith(
    expect.objectContaining({ id: "fire", animation: "fire", sound: "fire_2" }),
  );
  await user.click(
    within(gallery).getByRole("button", { name: "組み合わせを再生" }),
  );
  expect(play).toHaveBeenLastCalledWith(
    expect.objectContaining({ animation: "fire", sound: "fire_2" }),
  );
  expect(saved).not.toHaveBeenCalled();
  await user.click(
    within(gallery).getByRole("button", { name: "この演出を使う" }),
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(
    saved.mock.calls[0][0].skills.find((s: { id: string }) => s.id === "fire"),
  ).toMatchObject({ sound: "fire_2", animation: "fire" });
  expect(
    within(row).getByRole("button", { name: "ファイアの演出を選ぶ" }),
  ).toHaveTextContent("炎 · 炎魔法 2");
  expect(
    saved.mock.calls[0][0].skills.filter(
      (s: { id: string }) => s.id !== "fire",
    ),
  ).toMatchObject(sampleCatalog.skills.filter((s) => s.id !== "fire"));
  play.mockRestore();
});

it("merges a skill file into the draft, preserving other edits until explicit save", async () => {
  server.use(
    http.post("*/admin/game/skills/preview", async ({ request }) => {
      const { catalog, document } = (await request.json()) as {
        catalog: typeof sampleCatalog;
        document: { skills: typeof sampleCatalog.skills };
      };
      const skills = new Map(catalog.skills.map((s) => [s.id, s]));
      for (const skill of document.skills) skills.set(skill.id, skill);
      return HttpResponse.json({ ...catalog, skills: [...skills.values()] });
    }),
  );
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const fire = await screen.findByRole("row", { name: "ファイア" });
  fireEvent.change(
    within(screen.getByRole("row", { name: "ファイアの効果" })).getByLabelText(
      "正答効果の値",
      { exact: true },
    ),
    {
      target: { value: "7" },
    },
  );
  const imported = [
    { ...sampleCatalog.skills[1], name: "ケアル改", amount: 30 },
    { ...sampleCatalog.skills[0], id: "ice", name: "ブリザド" },
  ];
  await user.upload(
    screen.getByLabelText("スキルJSONファイル"),
    new File([skillFiles.skillFileText(imported)], "skills.json", {
      type: "application/json",
    }),
  );
  expect(await screen.findByRole("row", { name: "ケアル改" })).toBeVisible();
  expect(screen.getByRole("row", { name: "ブリザド" })).toBeVisible();
  expect(
    within(screen.getByRole("row", { name: "ファイアの効果" })).getByLabelText(
      "正答効果の値",
      { exact: true },
    ),
  ).toHaveValue(7);
  expect(saved).not.toHaveBeenCalled();
  expect(screen.getByText(/表を確認して「保存」/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  const catalog = saved.mock.calls[0][0];
  expect(catalog.skills).toHaveLength(4);
  expect(catalog.items).toEqual(sampleCatalog.items);
  expect(catalog.player_skills).toEqual(sampleCatalog.player_skills);
});

it("keeps the draft and deletion reservations when file validation fails", async () => {
  server.use(
    http.post("*/admin/game/skills/preview", () =>
      HttpResponse.json(
        {
          detail: [
            {
              loc: ["body", "document", "skills", 0, "effect"],
              msg: "Unknown effect",
            },
          ],
        },
        { status: 422 },
      ),
    ),
  );
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const fire = await screen.findByRole("row", { name: "ファイア" });
  await user.click(within(fire).getByRole("button", { name: "削除" }));
  const input = screen.getByLabelText("スキルJSONファイル");
  await user.upload(
    input,
    new File(["{"], "invalid.json", { type: "application/json" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "JSONの形式が正しくありません",
  );
  await user.upload(
    input,
    new File([skillFiles.skillFileText(sampleCatalog.skills)], "invalid.json", {
      type: "application/json",
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "document.skills.0.effect",
    ),
  );
  expect(fire).toHaveAttribute("data-pending-delete", "true");
  expect(saved).not.toHaveBeenCalled();
  expect(screen.getAllByRole("row", { name: "ケアル" })).toHaveLength(1);
});

it("exports template changes and excludes skills marked for deletion", async () => {
  const download = vi
    .spyOn(skillFiles, "downloadSkillFile")
    .mockImplementation(() => undefined);
  render(<CatalogEditor kind="skills" />);
  const fire = await screen.findByRole("row", { name: "ファイア" });
  await userEvent.click(within(fire).getByRole("button", { name: "削除" }));
  const heal = screen.getByRole("row", { name: "ケアルの効果" });
  fireEvent.change(
    within(heal).getByLabelText("正答効果の値", { exact: true }),
    {
      target: { value: "25" },
    },
  );
  await userEvent.click(screen.getByRole("button", { name: "JSONを書き出す" }));
  expect(download).toHaveBeenCalledWith(
    expect.not.arrayContaining([expect.objectContaining({ id: "fire" })]),
    expect.arrayContaining([
      expect.objectContaining({ id: "effect_heal", amount: 25 }),
    ]),
  );
  expect(saved).not.toHaveBeenCalled();
});

it("edits skills without material selection and preserves existing icon data", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const skill = await screen.findByRole("row", { name: "ファイア" });
  expect(skill.closest("fieldset")).toHaveClass("min-w-0");
  expect(
    screen.queryByRole("columnheader", { name: "素材" }),
  ).not.toBeInTheDocument();
  expect(
    within(skill).queryByRole("button", { name: /素材を選ぶ/ }),
  ).not.toBeInTheDocument();
  const effectRow = within(screen.getByRole("row", { name: "ファイアの効果" }));
  await user.selectOptions(effectRow.getByLabelText("正答効果の指定"), "fixed");
  const amount = effectRow.getByLabelText("正答効果の値", { exact: true });
  await user.clear(amount);
  await user.type(amount, "7");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].skills[0]).toMatchObject({
    id: "fire",
    icon: "flame",
    amount: 7,
  });
  expect(saved.mock.calls[0][0].items).toEqual(sampleCatalog.items);
  expect(await screen.findByText("保存しました")).toBeVisible();
});

it("references a skill from an item rather than defining a separate effect", async () => {
  render(<CatalogEditor kind="items" />);
  const user = userEvent.setup();
  await user.selectOptions(await screen.findByLabelText("発動スキル"), "heal");
  fireEvent.change(screen.getByLabelText("使用回数"), {
    target: { value: "3" },
  });
  expect(screen.getByRole("table", { name: "アイテム定義" })).toBeVisible();
  expect(screen.queryByLabelText(/価格/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].items[0]).toMatchObject({
    id: "healing_potion",
    skill_id: "heal",
    max_uses: 3,
  });
});

it("edits independent correct and wrong recovery amounts and strips inactive fields", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  const row = await screen.findByRole("row", { name: "ケアルの効果" });
  const field = within(row);
  expect(field.getByRole("option", { name: "反撃" })).toBeInTheDocument();
  expect(field.queryByLabelText("誤答効果の値")).not.toBeInTheDocument();
  await user.selectOptions(field.getByLabelText("タイプ"), "reduced");
  await user.selectOptions(
    field.getByLabelText("正答効果の指定"),
    "multiplier",
  );
  fireEvent.change(field.getByLabelText("正答効果の値"), {
    target: { value: "0.2" },
  });
  await user.selectOptions(
    field.getByLabelText("誤答効果の指定"),
    "multiplier",
  );
  fireEvent.change(field.getByLabelText("誤答効果の値"), {
    target: { value: "0.1" },
  });
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const recovery = saved.mock.calls
    .at(-1)?.[0]
    .skills.find((s: { id: string }) => s.id === "heal");
  expect(recovery).toMatchObject({
    amount: 20,
    amount_mode: "percent",
    on_wrong: { type: "reduced", amount: 10, amount_mode: "percent" },
  });
  expect(recovery.on_wrong).not.toHaveProperty("multiplier");
  await user.selectOptions(field.getByLabelText("タイプ"), "fizzle");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
  expect(
    saved.mock.calls
      .at(-1)?.[0]
      .skills.find((s: { id: string }) => s.id === "heal").on_wrong,
  ).toEqual({ type: "fizzle" });
});

it("adds templates and skills from the bottom of each unified table", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  await screen.findByRole("row", { name: "ファイア" });
  await user.click(
    screen.getByRole("button", { name: "効果テンプレートを追加" }),
  );
  const effect = screen.getByRole("row", { name: "新しい効果" });
  await user.selectOptions(within(effect).getByLabelText("計算"), "special");
  await user.click(screen.getByRole("button", { name: "スキルを追加" }));
  const skill = screen.getByRole("row", { name: "新しいスキル" });
  await user.selectOptions(
    within(skill).getByLabelText("効果テンプレート 1"),
    within(skill).getByRole("option", { name: "新しい効果" }),
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].skills.at(-1)).toMatchObject({
    effect: "attack",
    damage_type: "special",
  });
});

it("selects item art from the material gallery", async () => {
  render(<CatalogEditor kind="items" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "回復薬の素材を選ぶ" }),
  );
  const dialog = screen.getByRole("dialog", { name: "ゲーム素材一覧" });
  await user.type(
    within(dialog).getByRole("textbox", { name: "素材を検索" }),
    "猫",
  );
  await user.click(within(dialog).getByRole("button", { name: "猫" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].items[0].icon).toBe("cat");
});

it("marks skills for deletion, supports undo and commits removals only on save", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: "ファイア" });
  const headers = within(
    screen.getByRole("table", { name: "スキル一覧" }),
  ).getAllByRole("columnheader");
  expect(headers.at(-1)).toHaveTextContent("削除");
  await user.click(within(row).getByRole("button", { name: "削除" }));
  expect(row).toHaveAttribute("data-pending-delete", "true");
  expect(within(row).getByLabelText("名前")).toBeDisabled();
  expect(saved).not.toHaveBeenCalled();
  await user.click(within(row).getByRole("button", { name: "削除を取り消す" }));
  expect(row).not.toHaveAttribute("data-pending-delete");
  expect(within(row).getByLabelText("名前")).toBeEnabled();
  await user.click(within(row).getByRole("button", { name: "削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(
    saved.mock.calls[0][0].skills.some((s: { id: string }) => s.id === "fire"),
  ).toBe(false);
  expect(saved.mock.calls[0][0].player_skills).toEqual([
    { skill_id: "heal", enabled: true },
  ]);
  expect(
    screen.queryByRole("row", { name: "ファイア" }),
  ).not.toBeInTheDocument();
});

it("blocks deletion of a referenced skill and retains the pending row after a failed save", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: "薬の回復" });
  await user.click(within(row).getByRole("button", { name: "削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(screen.getByRole("alert")).toHaveTextContent("回復薬");
  expect(row).toHaveAttribute("data-pending-delete", "true");
  expect(saved).not.toHaveBeenCalled();
});

it("configures sale availability and prices independently from item definitions", async () => {
  render(<CatalogEditor kind="shop" />);
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: "回復薬" });
  const price = within(row).getByLabelText("価格（G）");
  expect(price).toHaveValue(30);
  await user.click(within(row).getByLabelText("販売"));
  expect(price).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].shop).toEqual([
    { item_id: "healing_potion", price: 30, enabled: false },
  ]);
  expect(saved.mock.calls[0][0].items).toEqual(sampleCatalog.items);
  await user.click(within(row).getByLabelText("販売"));
  await user.clear(price);
  await user.type(price, "75");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
  expect(saved.mock.calls[1][0].shop[0].price).toBe(75);
});

it("lists a previously non-sale item without changing its definition", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json({ ...sampleCatalog, shop: [] }),
    ),
  );
  render(<CatalogEditor kind="shop" />);
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: "回復薬" });
  expect(within(row).getByLabelText("販売")).not.toBeChecked();
  await user.click(within(row).getByLabelText("販売"));
  const price = within(row).getByLabelText("価格（G）");
  await user.clear(price);
  await user.type(price, "10");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].shop).toEqual([
    { item_id: "healing_potion", price: 10, enabled: true },
  ]);
});

it("retains the pending deletion when the server rejects saving", async () => {
  server.use(
    http.put("*/admin/game/catalog", () =>
      HttpResponse.json({ detail: "他の設定で使用中です。" }, { status: 422 }),
    ),
  );
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const row = await screen.findByRole("row", { name: "ファイア" });
  await user.click(within(row).getByRole("button", { name: "削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "他の設定で使用中です。",
  );
  expect(row).toHaveAttribute("data-pending-delete", "true");
  await user.click(within(row).getByRole("button", { name: "削除を取り消す" }));
  expect(within(row).getByLabelText("名前")).toBeEnabled();
});

it("defines a timed percentage buff in the unified template table", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  await screen.findByRole("row", { name: "ファイア" });
  await user.click(
    screen.getByRole("button", { name: "効果テンプレートを追加" }),
  );
  const row = screen.getByRole("row", { name: "新しい効果" });
  await user.selectOptions(within(row).getByLabelText("種別"), "status");
  await user.selectOptions(
    within(row).getByLabelText("対象ステータス"),
    "maxHp",
  );
  expect(within(row).getByLabelText("状態の値の指定")).toHaveValue("percent");
  for (const [label, value] of [
    ["状態の値", "50"],
    ["正答効果の値", "5"],
    ["重複上限", "2"],
  ]) {
    fireEvent.change(within(row).getByLabelText(label, { exact: true }), {
      target: { value },
    });
  }
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].skill_templates.at(-1)).toMatchObject({
    effect: "buff",
    stat: "maxHp",
    amount: 50,
    amount_mode: "percent",
    duration_turns: 5,
    stack_limit: 2,
  });
});

it("defines HP periodic recovery with grouped action durations and no negative amounts", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  await screen.findByRole("row", { name: "ファイア" });
  await user.click(
    screen.getByRole("button", { name: "効果テンプレートを追加" }),
  );
  const row = within(screen.getByRole("row", { name: "新しい効果" }));
  await user.selectOptions(row.getByLabelText("種別"), "status");
  await user.selectOptions(row.getByLabelText("対象ステータス"), "hp");
  expect(row.getByLabelText("詳細")).toHaveValue("recovery");
  fireEvent.change(row.getByLabelText("状態の値"), { target: { value: "6" } });
  fireEvent.change(row.getByLabelText("正答効果の値"), {
    target: { value: "5" },
  });
  await user.selectOptions(row.getByLabelText("タイプ"), "reduced");
  fireEvent.change(row.getByLabelText("誤答効果の値"), {
    target: { value: "2" },
  });
  expect(row.getByRole("group", { name: "正答効果" })).toContainElement(
    row.getByLabelText("正答効果の値"),
  );
  expect(row.getByRole("group", { name: "誤答効果" })).toContainElement(
    row.getByLabelText("誤答効果の値"),
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].skill_templates.at(-1)).toMatchObject({
    effect: "ailment",
    ailment: "regen",
    amount: 6,
    duration_turns: 5,
    on_wrong: { type: "reduced", apply: true, duration_turns: 2 },
  });
  expect(saved.mock.calls[0][0].skill_templates.at(-1)).not.toHaveProperty(
    "target",
  );
});

it("edits MP damage and recovery through detail with independent correct and wrong modes", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  await screen.findByRole("row", { name: "ファイア" });
  await user.click(
    screen.getByRole("button", { name: "効果テンプレートを追加" }),
  );
  const row = within(screen.getByRole("row", { name: "新しい効果" }));
  await user.selectOptions(row.getByLabelText("種別"), "mp");
  expect(row.getByLabelText("詳細")).toHaveValue("damage");
  await user.selectOptions(row.getByLabelText("対象数"), "all");
  await user.selectOptions(row.getByLabelText("詳細"), "recovery");
  fireEvent.change(row.getByLabelText("正答効果の値"), {
    target: { value: "12" },
  });
  await user.selectOptions(row.getByLabelText("タイプ"), "reduced");
  await user.selectOptions(row.getByLabelText("誤答効果の指定"), "multiplier");
  fireEvent.change(row.getByLabelText("誤答効果の値"), {
    target: { value: "0.25" },
  });
  expect(row.getByLabelText("正答効果の値")).toHaveAttribute("min", "0");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].skill_templates.at(-1)).toMatchObject({
    effect: "heal_mp",
    target_count: "all",
    amount: 12,
    amount_mode: "fixed",
    on_wrong: { type: "reduced", amount: 25, amount_mode: "percent" },
  });
});

it("uses one field per column and selects each skill's animation from its gallery", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const fire = await screen.findByRole("row", { name: "ファイア" });
  expect(
    screen.queryByRole("columnheader", { name: "プレビュー" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "演出一覧" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: "演出" }),
  ).not.toBeInTheDocument();
  for (const cell of within(fire).getAllByRole("cell"))
    expect(cell.querySelectorAll("input,select").length).toBeLessThanOrEqual(1);
  const heal = screen.getByRole("row", { name: "ケアル" });
  await user.click(
    within(heal).getByRole("button", { name: "ケアルの演出を選ぶ" }),
  );
  const gallery = screen.getByRole("dialog", { name: "ケアルの演出" });
  await user.click(
    within(gallery).getByRole("button", { name: "回復の波紋をプレビュー" }),
  );
  await user.click(
    within(gallery).getByRole("button", { name: "この演出を使う" }),
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(
    saved.mock.calls[0][0].skills.find((s: { id: string }) => s.id === "heal")
      .animation,
  ).toBe("ripple");
  expect(saved.mock.calls[0][0].skills[0]).toMatchObject(
    sampleCatalog.skills[0],
  );
});

it("opens the skill's static gallery and discards the selection on Escape", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  await screen.findByRole("row", { name: "ファイア" });
  const trigger = screen.getByRole("button", { name: "ファイアの演出を選ぶ" });
  await user.click(trigger);
  const gallery = screen.getByRole("dialog", { name: "ファイアの演出" });
  expect(
    within(gallery).getByRole("button", { name: "火球をプレビュー" }),
  ).toBeVisible();
  expect(gallery.querySelectorAll('img[src$="-poster.webp"]')).toHaveLength(45);
  expect(gallery.querySelector(".skill-sprite")).not.toBeInTheDocument();
  await user.click(
    within(gallery).getByRole("button", { name: "火球をプレビュー" }),
  );
  await user.click(
    within(gallery).getByRole("button", { name: "雷 2のSEを試聴" }),
  );
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveTextContent("なし");
  expect(trigger).toHaveTextContent("自動");
  await user.click(trigger);
  expect(
    screen.getByRole("button", { name: "なしをプレビュー" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("button", { name: "自動のSEを試聴" }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "閉じる" }));
  expect(saved).not.toHaveBeenCalled();
});

it.each([
  ["火球", "oga_spell_3"],
  ["樹木の加護", "oga_nature_1"],
  ["魔力の放電", "oga_arcane_5"],
  ["岩砕き", "oga_earth_3"],
  ["時の魔法陣", "oga_cosmic_2"],
  ["呪いのドクロ", "mochi_status_curse"],
  ["攻撃力アップ", "mochi_status_buff"],
  ["守りの盾", "mochi_status_shield"],
  ["再生の光", "mochi_status_heal"],
  ["加速の羽根", "mochi_status_speed"],
])(
  "previews %s and applies it only to the originating skill on confirmation",
  async (label, id) => {
    render(<CatalogEditor kind="skills" />);
    const user = userEvent.setup();
    const trigger = await screen.findByRole("button", {
      name: "ファイアの演出を選ぶ",
    });
    await user.click(trigger);
    const gallery = screen.getByRole("dialog", { name: "ファイアの演出" });
    const tile = within(gallery).getByRole("button", {
      name: `${label}をプレビュー`,
    });
    await user.click(tile);
    expect(
      tile.querySelector(`img[src="/game-assets/effects/${id}.webp"]`),
    ).toBeInTheDocument();
    const stage = tile.querySelector(".skill-sprite");
    if (!stage) throw new Error("Missing animated thumbnail");
    fireEvent.animationEnd(stage, { animationName: "skill-sprite-play" });
    fireEvent(stage, new Event("webkitAnimationEnd", { bubbles: true }));
    expect(tile.querySelector('img[src$="-poster.webp"]')).toBeInTheDocument();
    await user.click(within(gallery).getByRole("button", { name: "閉じる" }));
    expect(trigger).toHaveTextContent("なし");
    expect(saved).not.toHaveBeenCalled();
    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: `${label}をプレビュー` }),
    );
    await user.click(screen.getByRole("button", { name: "この演出を使う" }));
    expect(trigger).toHaveTextContent(label);
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(
      screen.getByRole("button", { name: `${label}をプレビュー` }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(saved.mock.calls[0][0].skills[0].animation).toBe(id);
    expect(
      saved.mock.calls[0][0].skills.find(
        (s: { id: string }) => s.id === "heal",
      ),
    ).toMatchObject(sampleCatalog.skills[1]);
  },
);

it("configures enemy icons and attacks and surfaces save failures", async () => {
  server.use(
    http.put("*/admin/game/catalog", () =>
      HttpResponse.json(
        { detail: "スキルの参照が不正です。" },
        { status: 422 },
      ),
    ),
  );
  render(<CatalogEditor kind="enemies" />);
  const user = userEvent.setup();
  await user.selectOptions(await screen.findByLabelText("攻撃スキル"), "fire");
  await user.click(screen.getByRole("checkbox", { name: "ボス用" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "スキルの参照が不正です。",
  );
  expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
  expect(screen.getByLabelText("攻撃スキル")).toHaveValue("fire");
});

it("filters boss art and saves the registered asset ID for an enemy", async () => {
  render(<CatalogEditor kind="enemies" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "ゴーストの素材を選ぶ" }),
  );
  const dialog = screen.getByRole("dialog", { name: "ゲーム素材一覧" });
  await user.click(within(dialog).getByRole("button", { name: "ボス" }));
  expect(
    within(dialog).queryByRole("button", { name: "インクスライム" }),
  ).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "水晶竜" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].enemies[0].icon).toBe("art_crystal_dragon");
});
