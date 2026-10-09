import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig, useSWRConfig } from "swr";
import { AdventureBadge } from "./AdventureBadge";
import { adventureAccessKey } from "./access";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { uid: "player" },
}));
vi.mock("~/features/auth/AuthProvider", () => ({ useAuth: () => auth }));

beforeEach(() => {
  auth.isAuthenticated = true;
});
afterEach(() => vi.unstubAllGlobals());

function Refresh() {
  const { mutate } = useSWRConfig();
  return (
    <button
      type="button"
      onClick={() =>
        void mutate(adventureAccessKey("player")).catch(() => undefined)
      }
    >
      更新
    </button>
  );
}
function badges() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      <AdventureBadge />
      <AdventureBadge />
      <Refresh />
    </SWRConfig>,
  );
}

it("shares access between badges and follows consumption and recovery", async () => {
  let available = true;
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          available,
          server_now: Date.now(),
          next_available_at: Date.now() + 600000,
        }),
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  badges();
  expect(
    screen.queryByRole("status", { name: "冒険可能" }),
  ).not.toBeInTheDocument();
  expect(
    await screen.findAllByRole("status", { name: "冒険可能" }),
  ).toHaveLength(2);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const user = userEvent.setup();
  available = false;
  await user.click(screen.getByRole("button", { name: "更新" }));
  await waitFor(() =>
    expect(screen.queryAllByRole("status", { name: "冒険可能" })).toHaveLength(
      0,
    ),
  );
  available = true;
  await user.click(screen.getByRole("button", { name: "更新" }));
  expect(
    await screen.findAllByRole("status", { name: "冒険可能" }),
  ).toHaveLength(2);
});

it("does not request or show adventure access when logged out", () => {
  auth.isAuthenticated = false;
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  badges();
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("status", { name: "冒険可能" }),
  ).not.toBeInTheDocument();
});

it("hides stale availability when revalidation fails", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          available: true,
          server_now: Date.now(),
          next_available_at: Date.now() + 600000,
        }),
      ),
    )
    .mockResolvedValue(
      new Response(JSON.stringify({ detail: "失敗" }), { status: 503 }),
    );
  vi.stubGlobal("fetch", fetcher);
  badges();
  await screen.findAllByRole("status", { name: "冒険可能" });
  await userEvent.setup().click(screen.getByRole("button", { name: "更新" }));
  await waitFor(() =>
    expect(screen.queryAllByRole("status", { name: "冒険可能" })).toHaveLength(
      0,
    ),
  );
});
