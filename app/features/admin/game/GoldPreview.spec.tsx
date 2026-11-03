import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { defaultGoldSettings } from "~/features/game/rewards";
import { networkFetch } from "~/shared/lib/networkFetch";
import GoldPreview from "./GoldPreview";

vi.mock("~/shared/lib/networkFetch", () => ({ networkFetch: vi.fn() }));
afterEach(() => vi.resetAllMocks());

it("previews current draft settings and marks previous results stale without saving", async () => {
  vi.mocked(networkFetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        enemy: { min: 21, typical: 24, max: 26 },
        chest: { min: 168, typical: 192, max: 211 },
      }),
    ),
  );
  const settings = { ...defaultGoldSettings, chest_multiplier: 8 };
  const view = render(<GoldPreview settings={settings} />);
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("試算Power"));
  await user.type(screen.getByLabelText("試算Power"), "2500");
  await user.clear(screen.getByLabelText("試算達成度"));
  await user.type(screen.getByLabelText("試算達成度"), "6");
  await user.click(screen.getByRole("button", { name: "試算" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "宝箱1個: 168〜211 G（中央 192 G）",
  );
  expect(networkFetch).toHaveBeenCalledTimes(1);
  const [url, request] = vi.mocked(networkFetch).mock.calls[0];
  expect(url).toMatch(/\/admin\/game\/rewards\/gold-preview$/);
  expect(JSON.parse(String(request?.body))).toEqual({
    settings,
    power: 2500,
    achievement: 6,
  });
  view.rerender(<GoldPreview settings={{ ...settings, base: 100 }} />);
  expect(screen.getByText(/再試算してください/)).toBeVisible();
});

it("reports failure and allows retry", async () => {
  vi.mocked(networkFetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: "試算に失敗" }), { status: 503 }),
  );
  render(<GoldPreview settings={defaultGoldSettings} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "試算" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("試算に失敗");
  expect(screen.getByRole("button", { name: "試算" })).toBeEnabled();
});
