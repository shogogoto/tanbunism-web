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
import { sampleCatalog } from "~/features/game/catalog.fixtures";
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
  ).toEqual(sampleCatalog.skills.filter((s) => s.id !== "fire"));
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
  fireEvent.change(within(fire).getByLabelText("加算ダメージ"), {
    target: { value: "7" },
  });
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
  expect(within(fire).getByLabelText("加算ダメージ")).toHaveValue(7);
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

it("exports current edits while leaving out skills marked for deletion", async () => {
  const download = vi
    .spyOn(skillFiles, "downloadSkillFile")
    .mockImplementation(() => undefined);
  try {
    render(<CatalogEditor kind="skills" />);
    const user = userEvent.setup();
    const fire = await screen.findByRole("row", { name: "ファイア" });
    await user.click(within(fire).getByRole("button", { name: "削除" }));
    const heal = screen.getByRole("row", { name: "ケアル" });
    fireEvent.change(within(heal).getByLabelText("効果量"), {
      target: { value: "25" },
    });
    await user.click(screen.getByRole("button", { name: "JSONを書き出す" }));
    expect(download).toHaveBeenCalledWith([
      expect.objectContaining({ ...sampleCatalog.skills[1], amount: 25 }),
      sampleCatalog.skills[2],
    ]);
    expect(saved).not.toHaveBeenCalled();
  } finally {
    download.mockRestore();
  }
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
  const amount = within(skill).getByLabelText("加算ダメージ");
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
  const row = await screen.findByRole("row", { name: "ケアル" });
  const field = within(row);
  expect(field.queryByRole("option", { name: "反撃" })).not.toBeInTheDocument();
  expect(field.getByLabelText("誤答効果量")).toBeDisabled();
  await user.selectOptions(field.getByLabelText("タイプ"), "reduced");
  await user.selectOptions(field.getByLabelText("効果量の指定"), "percent");
  await user.clear(field.getByLabelText("効果量"));
  await user.type(field.getByLabelText("効果量"), "20");
  await user.clear(field.getByLabelText("誤答効果量"));
  await user.type(field.getByLabelText("誤答効果量"), "10");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const recovery = saved.mock.calls
    .at(-1)?.[0]
    .skills.find((s: { id: string }) => s.id === "heal");
  expect(recovery).toMatchObject({
    amount: 20,
    amount_mode: "percent",
    on_wrong: { type: "reduced", amount: 10 },
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

it("adds physical and special attacks to separate tables without a redundant system selector", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  await screen.findByRole("row", { name: "ファイア" });
  for (const title of [
    "回復",
    "物理攻撃",
    "特殊攻撃",
    "バフ",
    "デバフ",
    "状態異常",
  ]) {
    expect(
      screen.getByRole("region", { name: `${title}スキル` }),
    ).toBeVisible();
  }
  await user.click(
    screen.getByRole("button", { name: "特殊攻撃スキルを追加" }),
  );
  const row = within(
    screen.getByRole("region", { name: "特殊攻撃スキル" }),
  ).getByRole("row", { name: "新しいスキル" });
  const fields = within(row);
  expect(fields.queryByLabelText("計算系統")).not.toBeInTheDocument();
  await user.selectOptions(fields.getByLabelText("タイプ"), "reduced");
  await user.clear(fields.getByLabelText("対象数"));
  await user.type(fields.getByLabelText("対象数"), "3");
  await user.clear(fields.getByLabelText("攻撃倍率"));
  await user.type(fields.getByLabelText("攻撃倍率"), "2");
  await user.clear(fields.getByLabelText("誤答攻撃倍率"));
  await user.type(fields.getByLabelText("誤答攻撃倍率"), "0.7");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls.at(-1)?.[0].skills.at(-1)).toMatchObject({
    effect: "attack",
    damage_type: "special",
    target_count: 3,
    multiplier: 2,
    on_wrong: { type: "reduced", multiplier: 0.7 },
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
    screen.getByRole("region", { name: "物理攻撃スキル" }),
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

it("defines timed percentage buffs with an explicit stacking limit", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  await screen.findByRole("row", { name: "ファイア" });
  await user.click(screen.getByRole("button", { name: "バフスキルを追加" }));
  const skill = within(
    screen.getByRole("region", { name: "バフスキル" }),
  ).getByRole("row", { name: "新しいスキル" });
  await user.selectOptions(
    within(skill).getByLabelText("対象ステータス"),
    "defense",
  );
  await user.selectOptions(
    within(skill).getByLabelText("効果量の指定"),
    "percent",
  );
  for (const [label, value] of [
    ["効果量", "30"],
    ["持続ターン", "2"],
    ["重複上限", "3"],
  ]) {
    const input = within(skill).getByLabelText(label, { exact: true });
    await user.clear(input);
    await user.type(input, value);
  }
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(
    saved.mock.calls[0][0].skills.find(
      (s: { effect: string }) => s.effect === "buff",
    ),
  ).toMatchObject({
    effect: "buff",
    target: "self",
    stat: "defense",
    amount_mode: "percent",
    amount: 30,
    duration_turns: 2,
    stack_limit: 3,
  });
});

it("uses one field per column and selects each skill's animation from its gallery", async () => {
  render(<CatalogEditor kind="skills" />);
  const user = userEvent.setup();
  const fire = await screen.findByRole("row", { name: "ファイア" });
  expect(
    within(within(fire).getByLabelText("効果"))
      .getAllByRole("option")
      .map((o) => o.getAttribute("value")),
  ).toEqual(["physical", "special"]);
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
  expect(saved.mock.calls[0][0].skills[0]).toEqual(sampleCatalog.skills[0]);
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
    ).toEqual(sampleCatalog.skills.find((s) => s.id === "heal"));
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
