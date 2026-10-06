import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { SWRConfig } from "swr";
import { getQuizChain } from "~/features/quiz/api";
import { historyCache, tanbunDetailCache } from "~/shared/lib/indexed";
import { TanbunPreviewDialog } from "./Preview";
import { canonicalSentenceId, invalidateTanbunDetails } from "./cache";
import { fixtureDetail1 } from "./fixture";
import TanbunChainView from "./index";

vi.mock("~/features/resource/detail/SentenceQuizActions", () => ({
  default: () => null,
}));
vi.mock("~/features/quiz/api", () => ({ getQuizChain: vi.fn() }));

const response = () =>
  new Response(JSON.stringify([fixtureDetail1]), { status: 200 });
beforeEach(async () => {
  await tanbunDetailCache.clear();
  await historyCache.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => response()),
  );
});
afterEach(() => vi.unstubAllGlobals());

function wrap(element: React.ReactNode) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <MemoryRouter initialEntries={["/review"]}>{element}</MemoryRouter>
    </SWRConfig>,
  );
}

it("TLのプレビューと詳細ページは同じメモリキャッシュを使い、単文URLを履歴に保存する", async () => {
  wrap(
    <Routes>
      <Route
        path="/review"
        element={
          <TanbunPreviewDialog
            target={{ sentenceId: fixtureDetail1.uid.replaceAll("-", "") }}
            onClose={() => undefined}
          />
        }
      />
      <Route
        path="/tanbun/:id"
        element={<TanbunChainView id={fixtureDetail1.uid} />}
      />
    </Routes>,
  );
  await screen.findByRole("navigation", { name: "保存場所" });
  await waitFor(async () =>
    expect(await historyCache.getAll()).toEqual([
      expect.objectContaining({ url: `/tanbun/${fixtureDetail1.uid}` }),
    ]),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("link", { name: "単文ページを開く" }));
  await screen.findByRole("navigation", { name: "保存場所" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("永続キャッシュがあれば通信完了を待たずに詳細を表示する", async () => {
  await tanbunDetailCache.set(fixtureDetail1);
  vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));
  wrap(
    <TanbunPreviewDialog
      target={{ sentenceId: fixtureDetail1.uid }}
      onClose={() => undefined}
    />,
  );
  expect(
    await screen.findByRole("navigation", { name: "保存場所" }),
  ).toBeVisible();
});

it("RELクイズのBは文章検索ではなくクイズの正解参照から特定する", async () => {
  const source = fixtureDetail1.knowdes[fixtureDetail1.uid.replaceAll("-", "")];
  vi.mocked(getQuizChain).mockResolvedValue({
    sentences: [source],
    quizzes: [],
    links: [
      { quiz_id: "quiz-1", role: "target", sentence_id: "another" },
      { quiz_id: "quiz-1", role: "correct", sentence_id: source.uid },
    ],
  });
  wrap(
    <TanbunPreviewDialog
      target={{ quizId: "quiz-1", role: "correct", sentence: source.sentence }}
      onClose={() => undefined}
    />,
  );
  expect(
    await screen.findByRole("link", { name: "単文ページを開く" }),
  ).toHaveAttribute("href", `/tanbun/${canonicalSentenceId(source.uid)}`);
  expect(
    await screen.findByRole("navigation", { name: "保存場所" }),
  ).toBeVisible();
});

it("通信失敗でも閉じられ、再読み込みで復旧できる", async () => {
  const close = vi.fn();
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  wrap(
    <TanbunPreviewDialog
      target={{ sentenceId: fixtureDetail1.uid }}
      onClose={close}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
  await screen.findByRole("navigation", { name: "保存場所" });
  fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
  expect(close).toHaveBeenCalled();
});

it("import後は単文詳細の永続キャッシュを破棄する", async () => {
  await tanbunDetailCache.set(fixtureDetail1);
  await act(() => invalidateTanbunDetails());
  expect(await tanbunDetailCache.get(fixtureDetail1.uid)).toBeUndefined();
});
