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
  await user.click(within(row).getByRole("button", { name: "行動 1" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "魔法使いのガンビット" }),
  );
  await user.selectOptions(dialog.getByLabelText("使用スキル"), "heal");
  await user.click(dialog.getByRole("button", { name: "閉じる" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByText("保存しました");
  expect(saved.mock.calls[0][0].gambit_sets[0].rules).toEqual([
    { ...rules[0], skill_id: "heal" },
  ]);
  expect(saved.mock.calls[0][0].enemies[0].gambit_set_id).toBe("mage");
});
