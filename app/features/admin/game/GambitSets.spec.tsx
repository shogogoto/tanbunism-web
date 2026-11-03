import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import CatalogEditor from "./CatalogEditor";
import TriggerEditor from "./TriggerEditor";

const saved = vi.fn();
const rules = [{ trigger_id: "always", skill_id: "fire", enabled: true }];
const catalog = {
  ...sampleCatalog,
  triggers: [
    {
      id: "always",
      name: "いつでも",
      condition: "always",
      threshold: 0,
      target: "enemy",
      enabled: true,
    },
  ],
  gambit_sets: [{ id: "mage", name: "魔法使い", rules }],
  enemies: [{ ...sampleCatalog.enemies[0], gambit_set_id: "mage" }],
};
const server = setupServer(
  http.get("*/admin/game/catalog", () => HttpResponse.json(catalog)),
  http.put("*/admin/game/catalog", async ({ request }) => {
    const body = await request.json();
    saved(body);
    return HttpResponse.json(body);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
afterAll(() => server.close());

it("selects a shared set from an enemy without duplicating its rules", async () => {
  render(<CatalogEditor kind="enemies" />);
  expect(await screen.findByLabelText("ガンビットセット")).toHaveValue("mage");
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("ガンビットセット"), "");
  await user.selectOptions(screen.getByLabelText("ガンビットセット"), "mage");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].enemies[0]).toMatchObject({
    gambit_set_id: "mage",
    gambits: [],
  });
  expect(saved.mock.calls[0][0].gambit_sets).toEqual(catalog.gambit_sets);
});

it("blocks deleting equipped sets and edits the rules from the gambit tab", async () => {
  render(<TriggerEditor />);
  const table = await screen.findByRole("table", { name: "ガンビットセット" });
  const row = within(table).getByRole("row", { name: "魔法使い" });
  expect(within(row).getByRole("button", { name: "削除" })).toBeDisabled();
  const user = userEvent.setup();
  expect(
    within(row).queryByRole("button", { name: /行動 \d/ }),
  ).not.toBeInTheDocument();
  const actions = within(row).getByRole("table", {
    name: "魔法使いのガンビット",
  });
  expect(actions).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.selectOptions(
    within(actions).getByLabelText("使用スキル"),
    "heal",
  );
  await user.click(
    within(row).getByRole("button", { name: "魔法使いに条件を追加" }),
  );
  await user.click(within(actions).getByRole("button", { name: "2番を削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].gambit_sets[0].rules).toEqual([
    { ...rules[0], skill_id: "heal" },
  ]);
  expect(saved.mock.calls[0][0].enemies[0].gambit_set_id).toBe("mage");
});

it("assigns, transfers, and removes enemy badges without duplicating ownership", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json({
        ...catalog,
        gambit_sets: [
          ...catalog.gambit_sets,
          { id: "healer", name: "回復役", rules: [] },
        ],
      }),
    ),
  );
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const table = await screen.findByRole("table", { name: "ガンビットセット" });
  expect(within(table).getByRole("columnheader", { name: "敵" })).toBeVisible();
  const mage = within(table).getByRole("row", {
    name: "魔法使い",
  });
  const healer = within(table).getByRole("row", {
    name: "回復役",
  });
  expect(
    within(healer).getByRole("option", {
      name: /ゴースト（魔法使いから移動）/,
    }),
  ).toBeInTheDocument();
  await user.selectOptions(
    within(healer).getByLabelText("回復役に敵を追加"),
    catalog.enemies[0].id,
  );
  expect(
    within(mage).queryByRole("button", { name: "魔法使いからゴーストを解除" }),
  ).not.toBeInTheDocument();
  expect(within(mage).getByRole("button", { name: "削除" })).toBeEnabled();
  expect(within(healer).getByRole("button", { name: "削除" })).toBeDisabled();
  await user.click(
    within(healer).getByRole("button", { name: "回復役からゴーストを解除" }),
  );
  expect(within(healer).getByRole("button", { name: "削除" })).toBeEnabled();
  await user.selectOptions(
    within(mage).getByLabelText("魔法使いに敵を追加"),
    catalog.enemies[0].id,
  );
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].enemies[0].gambit_set_id).toBe("mage");
});

it("reorders inline actions independently from the surrounding sets and persists priority", async () => {
  server.use(
    http.get("*/admin/game/catalog", () =>
      HttpResponse.json({
        ...catalog,
        gambit_sets: [
          {
            ...catalog.gambit_sets[0],
            rules: [...rules, { ...rules[0], skill_id: "heal" }],
          },
          { id: "other", name: "別セット", rules },
        ],
      }),
    ),
  );
  const user = userEvent.setup();
  render(<TriggerEditor />);
  const actions = await screen.findByRole("table", {
    name: "魔法使いのガンビット",
  });
  const rows = () =>
    within(actions)
      .getAllByRole("row")
      .filter((row) => row.hasAttribute("aria-label"));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return new DOMRect(
        0,
        Math.max(0, rows().indexOf(this.closest("tr") as HTMLElement)) * 100,
        800,
        100,
      );
    },
  );
  const handle = within(rows()[0]).getByRole("button", {
    name: "ドラッグして並べ替え",
  });
  handle.focus();
  await user.keyboard("[Space][ArrowDown][Space]");
  expect(within(rows()[0]).getByLabelText("使用スキル")).toHaveValue("heal");
  expect(within(rows()[1]).getByLabelText("使用スキル")).toHaveValue("fire");
  expect(
    within(
      screen.getByRole("table", { name: "別セットのガンビット" }),
    ).getByLabelText("使用スキル"),
  ).toHaveValue("fire");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(
    saved.mock.calls[0][0].gambit_sets.map((group: { id: string }) => group.id),
  ).toEqual(["mage", "other"]);
  expect(
    saved.mock.calls[0][0].gambit_sets[0].rules.map(
      (rule: { skill_id: string }) => rule.skill_id,
    ),
  ).toEqual(["heal", "fire"]);
});
