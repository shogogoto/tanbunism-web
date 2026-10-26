import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/shared/components/ui/tabs";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import GameAdminManager from ".";
import { alignAdminDungeonRegions, listAdminGameDungeons } from "./api";

vi.mock("../battle", () => ({ default: () => null }));
vi.mock("./CatalogEditor", () => ({
  default: ({ kind }: { kind: string }) => <p>{kind}カタログ</p>,
}));
vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "admin", is_superuser: true },
    isAuthenticated: true,
    isLoading: false,
  }),
}));
vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({ histories: [] }),
}));
vi.mock("./api", () => ({
  listAdminGameDungeons: vi.fn(),
  rebuildAdminDungeonEnemies: vi.fn(),
  alignAdminDungeonRegions: vi.fn(),
}));

it("aligns only the selected user's dungeon from the admin table", async () => {
  vi.mocked(listAdminGameDungeons).mockResolvedValue([
    {
      user_id: "user-a",
      user_email: "a@example.com",
      resource_id: "book-a",
      resource_name: "本A",
      status: "path",
      region_count: 2,
      quiz_count: 10,
      regions: [],
    },
  ]);
  vi.mocked(alignAdminDungeonRegions).mockResolvedValue({
    changed: true,
    region_count: 2,
    place_count: 7,
  });
  render(
    <MemoryRouter initialEntries={["/admin/game/dungeons"]}>
      <Routes>
        <Route path="/admin/game/:subtab" element={<GameAdminManager />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("tab", { name: "ショップ" })).toHaveAttribute(
    "title",
    "t → 7",
  );
  await userEvent
    .setup()
    .click(await screen.findByRole("button", { name: "領域を整列" }));
  expect(alignAdminDungeonRegions).toHaveBeenCalledWith("user-a", "book-a");
  await waitFor(() => expect(listAdminGameDungeons).toHaveBeenCalledTimes(2));
});

function Location() {
  return <output aria-label="現在のURL">{useLocation().pathname}</output>;
}
function setup(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <HistoryPanelProvider>
        <HotkeyProvider>
          <Tabs defaultValue="game">
            <TabsList aria-label="管理画面">
              <TabsTrigger value="game">ゲーム</TabsTrigger>
            </TabsList>
            <TabsContent value="game">
              <Routes>
                <Route
                  path="/admin/game/:subtab"
                  element={<GameAdminManager />}
                />
              </Routes>
            </TabsContent>
          </Tabs>
          <Location />
          <GlobalHotkeys />
        </HotkeyProvider>
      </HistoryPanelProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

it("removes the item subtab and uses the new numbering for actual t-number shortcuts", async () => {
  const user = setup("/admin/game/skills");
  const skillTab = screen.getByRole("tab", { name: "スキル" });
  const list = skillTab.closest('[role="tablist"]');
  if (!list) throw new Error("Missing game tabs");
  expect(within(list as HTMLElement).getAllByRole("tab")).toHaveLength(8);
  expect(
    screen.queryByRole("tab", { name: "アイテム" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "敵" })).toHaveAttribute(
    "title",
    "t → 4",
  );
  expect(screen.getByRole("tab", { name: "ショップ" })).toHaveAttribute(
    "title",
    "t → 7",
  );
  expect(screen.getByRole("tab", { name: "属性" })).toHaveAttribute(
    "title",
    "t → 8",
  );
  await user.keyboard("t4");
  expect(screen.getByLabelText("現在のURL")).toHaveTextContent(
    "/admin/game/enemies",
  );
  await user.keyboard("t7");
  expect(screen.getByLabelText("現在のURL")).toHaveTextContent(
    "/admin/game/shop",
  );
  await user.keyboard("t3");
  expect(screen.getByLabelText("現在のURL")).toHaveTextContent(
    "/admin/game/skills",
  );
});

it("redirects the retired item URL to the combined skills editor", async () => {
  setup("/admin/game/items");
  await waitFor(() =>
    expect(screen.getByLabelText("現在のURL")).toHaveTextContent(
      "/admin/game/skills",
    ),
  );
  expect(screen.getByRole("tab", { name: "スキル" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("skillsカタログ")).toBeVisible();
});
