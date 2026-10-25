import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { type GameCatalog, prepareSkillCatalog } from "~/features/game/catalog";
import { sampleVariantSetCatalog } from "~/features/game/catalog.fixtures";
import CatalogEditor from "./CatalogEditor";

let stored: GameCatalog;
const server = setupServer(
  http.get("*/admin/game/catalog", () => HttpResponse.json(stored)),
  http.put("*/admin/game/catalog", async ({ request }) => {
    stored = (await request.json()) as GameCatalog;
    return HttpResponse.json(stored);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  stored = prepareSkillCatalog(structuredClone(sampleVariantSetCatalog));
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("selects shared tier/range without listing the Cartesian product and restores references after saving", async () => {
  const user = userEvent.setup();
  const view = render(<CatalogEditor kind="skills" />);
  const fire = await screen.findByRole("row", { name: "ファイア" });
  await user.click(
    within(fire).getByRole("button", { name: "効果 1の変型を選ぶ" }),
  );
  const picker = screen.getByRole("dialog", { name: "魔法攻撃の組み合わせ" });
  await user.selectOptions(within(picker).getByLabelText("威力段階"), "mid");
  await user.selectOptions(within(picker).getByLabelText("対象範囲"), "area");
  await user.click(
    within(picker).getByRole("button", { name: "この組み合わせを使う" }),
  );
  expect(
    within(fire).getByRole("combobox", { name: "効果テンプレート 1" }),
  ).toHaveDisplayValue("魔法攻撃（中級, 範囲）");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  const reference = stored.skills.find((s) => s.id === "fire")
    ?.template_ids?.[0];
  expect(stored.skills.find((s) => s.id === "fire")).toMatchObject({
    multiplier: 1.8,
    target_count: 3,
  });
  expect(
    stored.skill_templates?.filter((t) => t.variant_selections?.length),
  ).toHaveLength(1);
  expect(
    screen.queryByRole("row", { name: "魔法攻撃（中級, 範囲）" }),
  ).not.toBeInTheDocument();
  view.unmount();
  render(<CatalogEditor kind="skills" />);
  const restored = await screen.findByRole("row", { name: "ファイア" });
  expect(
    within(restored).getByRole("combobox", { name: "効果テンプレート 1" }),
  ).toHaveValue(reference);
  await user.click(
    within(restored).getByRole("button", { name: "効果 1の変型を選ぶ" }),
  );
  expect(screen.getByLabelText("威力段階")).toHaveValue("mid");
  expect(screen.getByLabelText("対象範囲")).toHaveValue("area");
});

it("edits a reusable set from the variation panel, updates all references, and blocks deletion of a used candidate", async () => {
  const root = stored.skill_templates?.find((t) => t.id === "basic_spell");
  if (!root) throw new Error("missing fixture");
  stored.skill_templates?.push({
    ...root,
    id: "combination",
    base_template_id: root.id,
    override_fields: [],
    variant_selections: [
      { set_id: "tier", value_id: "mid" },
      { set_id: "range", value_id: "area" },
    ],
  });
  stored.skills = stored.skills.map((s) =>
    ["fire", "thunder"].includes(s.id)
      ? { ...s, template_ids: ["combination"] }
      : s,
  );
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  const row = await screen.findByRole("row", { name: "魔法攻撃" });
  await user.click(within(row).getByRole("button", { name: "変型" }));
  await user.click(screen.getByRole("button", { name: "変型セットを管理" }));
  const manager = screen.getByRole("dialog", {
    name: "変型セット",
  });
  const tier = within(manager).getByRole("group", { name: "威力段階" });
  await user.clear(within(tier).getAllByLabelText("セットのサブ名")[1]);
  await user.type(within(tier).getAllByLabelText("セットのサブ名")[1], "中位");
  fireEvent.change(within(tier).getAllByLabelText("セットの値")[1], {
    target: { value: "2.2" },
  });
  await user.click(
    within(manager).getByRole("button", { name: "セットを反映" }),
  );
  await user.click(screen.getByRole("button", { name: "変型セットを管理" }));
  const reopened = screen.getByRole("dialog", {
    name: "変型セット",
  });
  const edited = within(reopened).getByRole("group", { name: "威力段階" });
  await user.click(
    within(edited).getAllByRole("button", { name: "セットの候補を削除" })[1],
  );
  await user.click(
    within(reopened).getByRole("button", { name: "セットを反映" }),
  );
  expect(within(reopened).getByRole("alert")).toHaveTextContent(
    "候補が見つかりません",
  );
  await user.click(within(reopened).getByRole("button", { name: "Close" }));
  const parent = screen.getByRole("dialog", { name: "魔法攻撃の変型" });
  await user.click(within(parent).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(
    stored.skills
      .filter((s) => ["fire", "thunder"].includes(s.id))
      .map((s) => s.multiplier),
  ).toEqual([2.2, 2.2]);
  expect(
    stored.skill_templates?.find((t) => t.id === "combination")?.name,
  ).toBe("魔法攻撃（中位, 範囲）");
});

it("creates shared sets in the floating editor and prevents attaching two sets for the same field", async () => {
  const user = userEvent.setup();
  render(<CatalogEditor kind="skills" />);
  const row = await screen.findByRole("row", { name: "魔法攻撃" });
  await user.click(within(row).getByRole("button", { name: "変型" }));
  await user.click(screen.getByRole("button", { name: "変型セットを管理" }));
  const manager = screen.getByRole("dialog", {
    name: "変型セット",
  });
  await user.click(
    within(manager).getByRole("button", { name: "＋ セットを追加" }),
  );
  const set = within(manager).getByRole("group", { name: "新しいセット" });
  await user.clear(within(set).getByLabelText("セット名"));
  await user.type(within(set).getByLabelText("セット名"), "別の範囲");
  await user.click(within(set).getByRole("button", { name: "＋ 候補を追加" }));
  await user.click(
    within(manager).getByRole("button", { name: "セットを反映" }),
  );
  expect(
    screen.getByRole("checkbox", { name: "別の範囲を使用" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: "対象範囲を使用" }));
  expect(
    screen.getByRole("checkbox", { name: "別の範囲を使用" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("checkbox", { name: "別の範囲を使用" }));
  expect(
    screen.getByRole("checkbox", { name: "対象範囲を使用" }),
  ).toBeDisabled();
});
