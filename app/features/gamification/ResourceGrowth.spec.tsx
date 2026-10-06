import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import ResourceGrowthBadge, { ResourceGrowthProvider } from "./ResourceGrowth";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "user-1" }, isAuthenticated: true }),
}));
const server = setupServer(
  http.get("*/user/me/resource-growth", () =>
    HttpResponse.json({
      rules: {
        exposure_xp: 1,
        answer_xp: 5,
        correct_bonus_xp: 2,
        level_curve: 50,
      },
      resources: [
        {
          resource_id: "resource-1",
          total_xp: 57,
          level: 2,
          current_level_xp: 7,
          xp_for_next_level: 150,
          power: 8,
          logic_count: 3,
          reference_count: 5,
          recent_xp: [
            {
              source: "quiz_answer",
              xp: 5,
              subject: "当時の単文",
              earned_on: "2026-10-06",
            },
          ],
        },
      ],
    }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderGrowth() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <ResourceGrowthProvider>
        <ResourceGrowthBadge resourceId="resource-1" />
      </ResourceGrowthProvider>
    </SWRConfig>,
  );
}

it("一覧は小さく表示し、内訳でPowerと復習XPの根拠を確認できる", async () => {
  renderGrowth();
  expect(
    await screen.findByRole("button", { name: "LvとPowerの内訳" }),
  ).toHaveTextContent("Lv.2");
  expect(screen.getByText("Power 8")).toBeVisible();
  expect(screen.getByText("7/150")).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "LvとPowerの内訳" }),
  );
  expect(screen.getByText("次のLvまで 143 XP")).toBeVisible();
  expect(screen.getByText(/論理 3 ＋ 参照 5/)).toBeVisible();
  expect(screen.getByText("当時の単文")).toBeVisible();
  expect(screen.getByText("+5 XP")).toBeVisible();
  expect(screen.getByText(/導入後の復習から記録/)).toBeVisible();
});

it("取得に失敗してもResourceの一覧を妨げない", async () => {
  server.use(
    http.get(
      "*/user/me/resource-growth",
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  renderGrowth();
  expect(await screen.findByText("Lv取得失敗")).toHaveAttribute(
    "title",
    "Lv・Powerを取得できませんでした。",
  );
});

it("本人の進捗を渡していない一覧では表示しない", () => {
  const { container } = render(<ResourceGrowthBadge resourceId="resource-1" />);
  expect(container).toBeEmptyDOMElement();
});
