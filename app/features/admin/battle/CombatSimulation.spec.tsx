import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import CombatSimulation from "./CombatSimulation";
import type { CombatSimulationInput } from "./api";

const requests: CombatSimulationInput[] = [];
const server = setupServer(
  http.post(
    "*/admin/settings/game-balance/simulate-combat",
    async ({ request }) => {
      const input = (await request.json()) as CombatSimulationInput;
      requests.push(input);
      return HttpResponse.json({
        ...input,
        damage_to_enemy: 10,
        damage_to_player: 15,
        correct_answers_to_defeat: 3,
        incorrect_answers_to_defeat: 3,
      });
    },
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

it("uses server damage results and retains earlier inputs while editing", async () => {
  render(<CombatSimulation />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "戦闘を試算して比較に追加" }),
  );
  const table = await screen.findByRole("table", { name: "戦闘試算比較" });
  expect(requests).toEqual([
    {
      player: { hp: 35, attack: 10, defense: 1 },
      enemy: { hp: 28, attack: 16 },
    },
  ]);
  expect(within(table).getByText("15")).toBeVisible();
  const attack = screen.getByLabelText("プレイヤーの攻撃力");
  await user.clear(attack);
  await user.type(attack, "20");
  expect(within(table).getAllByText("10")).toHaveLength(2);
  await user.click(
    screen.getByRole("button", { name: "戦闘を試算して比較に追加" }),
  );
  expect(await within(table).findByText("20")).toBeVisible();
  expect(within(table).getAllByRole("row")).toHaveLength(3);
  await user.click(screen.getByRole("button", { name: "戦闘試算をクリア" }));
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("shows API errors without losing existing comparison rows", async () => {
  render(<CombatSimulation />);
  const user = userEvent.setup();
  const submit = screen.getByRole("button", {
    name: "戦闘を試算して比較に追加",
  });
  await user.click(submit);
  await screen.findByRole("table");
  server.use(
    http.post("*/admin/settings/game-balance/simulate-combat", () =>
      HttpResponse.json({ detail: "通信失敗" }, { status: 503 }),
    ),
  );
  await user.click(submit);
  expect(await screen.findByRole("alert")).toHaveTextContent("通信失敗");
  expect(screen.getByRole("table")).toBeVisible();
});
