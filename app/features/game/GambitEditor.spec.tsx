import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import GambitEditor from "./GambitEditor";
import { sampleCatalog } from "./catalog.fixtures";
import { newSave } from "./domain";

const saved = vi.fn();
const onSaved = vi.fn();
const server = setupServer(
  http.get("*/game/gambits/capacity", () =>
    HttpResponse.json({ slots: 2, next_level: 10 }),
  ),
  http.get("*/game/catalog", () => HttpResponse.json(sampleCatalog)),
  http.put("*/game/gambits", async ({ request }) => {
    const body = await request.json();
    saved(body);
    return HttpResponse.json({ revision: 5, save: newSave() });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());
function setup(disabled = false) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <GambitEditor
        revision={4}
        save={{
          ...newSave(),
          gambits: [
            {
              enabled: true,
              condition: "hp_below",
              threshold: 30,
              action: "skill",
              definition_id: "heal",
            },
          ],
        }}
        disabled={disabled}
        onSaved={onSaved}
      />
    </SWRConfig>,
  );
  return userEvent.setup();
}

it("saves the target on a gambit rather than an effect template", async () => {
  const user = setup();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  const row = screen.getByRole("region", { name: "ガンビット 1" });
  await user.selectOptions(within(row).getByLabelText("対象"), "enemy");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].rules[0]).toMatchObject({
    definition_id: "heal",
    target: "enemy",
  });
});

it("does not offer unpurchased shop triggers as selectable gambits", async () => {
  server.use(
    http.get("*/game/catalog", () =>
      HttpResponse.json({
        ...sampleCatalog,
        triggers: [
          {
            id: "paid",
            name: "HP30%以下の味方",
            condition: "hp_below",
            threshold: 30,
            target: "ally",
            enabled: true,
          },
        ],
        shop: [{ trigger_id: "paid", price: 120, enabled: true }],
      }),
    ),
  );
  setup();
  const option = await screen.findByRole("option", {
    name: "HP30%以下の味方（未解放・無効）",
  });
  expect(option).toBeDisabled();
  expect(screen.getByRole("button", { name: "条件を追加" })).toBeDisabled();
});

it("selects the admin trigger variant and locks its shared condition/action target", async () => {
  server.use(
    http.get("*/game/catalog", () =>
      HttpResponse.json({
        ...sampleCatalog,
        triggers: [
          {
            id: "hp",
            name: "HP条件",
            condition: "hp_below",
            target: "ally",
            threshold: 30,
            enabled: true,
            variant_field: "target",
            variants: [{ id: "foe", name: "敵", value: "enemy" }],
          },
        ],
      }),
    ),
  );
  const user = setup();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  const row = within(screen.getByRole("region", { name: "ガンビット 1" }));
  await user.selectOptions(row.getByLabelText("条件"), "hp");
  expect(row.getByLabelText("対象")).toBeDisabled();
  expect(row.getByLabelText("対象")).toHaveValue("ally");
  expect(row.queryByRole("spinbutton", { name: "値" })).not.toBeInTheDocument();
  await user.selectOptions(row.getByLabelText("変型"), "foe");
  expect(row.getByLabelText("対象")).toHaveValue("enemy");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].rules[0]).toMatchObject({
    trigger_id: "hp",
    trigger_variant_id: "foe",
  });
});

it("reorders conditions and saves item references without browser-only row IDs", async () => {
  const user = setup();
  const add = screen.getByRole("button", { name: "条件を追加" });
  await waitFor(() => expect(add).toBeEnabled());
  await user.click(add);
  const row = screen.getByRole("region", { name: "ガンビット 2" });
  await user.selectOptions(within(row).getByLabelText("行動"), "item");
  await user.click(screen.getByRole("button", { name: "2番を上へ" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0]).toEqual({
    revision: 4,
    rules: [
      {
        enabled: true,
        condition: "always",
        threshold: 30,
        action: "item",
        definition_id: "healing_potion",
      },
      {
        enabled: true,
        condition: "hp_below",
        threshold: 30,
        action: "skill",
        definition_id: "heal",
      },
    ],
  });
  expect(onSaved).toHaveBeenCalledWith({ revision: 5, save: newSave() });
});

it("copies the admin's state skill reference when choosing a trigger", async () => {
  server.use(
    http.get("*/game/catalog", () =>
      HttpResponse.json({
        ...sampleCatalog,
        triggers: [
          {
            id: "protected",
            name: "プロテクトなし",
            condition: "state",
            threshold: 30,
            state_skill_id: "protect",
            state_present: false,
            enabled: true,
          },
        ],
      }),
    ),
  );
  const user = setup();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  const row = screen.getByRole("region", { name: "ガンビット 1" });
  await user.selectOptions(within(row).getByLabelText("条件"), "protected");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].rules[0]).toMatchObject({
    condition: "state",
    trigger_id: "protected",
    state_skill_id: "protect",
    state_present: false,
  });
});

it("preserves changes after a stale save", async () => {
  server.use(
    http.put("*/game/gambits", () =>
      HttpResponse.json(
        { detail: "状態が更新されています。" },
        { status: 409 },
      ),
    ),
  );
  const user = setup();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  const threshold = screen.getByRole("spinbutton", { name: "値" });
  await user.clear(threshold);
  await user.type(threshold, "45");
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "状態が更新されています。",
  );
  expect(threshold).toHaveValue(45);
});

it("disables editing and saving during battle", async () => {
  setup(true);
  await screen.findByRole("region", { name: "ガンビット 1" });
  expect(screen.getByRole("spinbutton", { name: "値" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "条件を追加" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
});

it("limits a new player to one slot and shows the next unlock level", async () => {
  server.use(
    http.get("*/game/gambits/capacity", () =>
      HttpResponse.json({ slots: 1, next_level: 5 }),
    ),
  );
  setup();
  expect(await screen.findByText("ガンビット 1/1枠 · 次はLv.5")).toBeVisible();
  expect(screen.getByRole("button", { name: "条件を追加" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
});
