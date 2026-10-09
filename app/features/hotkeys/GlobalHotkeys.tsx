import { CircleHelp } from "lucide-react";
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import LogoutDialogContent from "~/features/auth/SignOutDialog";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import { useHistoryPanel } from "~/shared/history/HistoryPanel";

const CHORD_TIMEOUT_MS = 1_200;

type HotkeyContextValue = {
  openHelp: () => void;
};

const HotkeyContext = createContext<HotkeyContextValue | null>(null);

export function HotkeyProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const { pathname, search } = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  return (
    <HotkeyContext.Provider value={{ openHelp }}>
      {children}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>キーボードショートカット</DialogTitle>
            <DialogDescription>
              入力欄へ入力している間は反応しません。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
            <ContextHotkeySection pathname={pathname} search={search} />
            <section aria-labelledby="global-hotkeys-heading">
              <h3 id="global-hotkeys-heading" className="text-sm font-semibold">
                共通
              </h3>
              <dl className="mt-1 divide-y">
                <HotkeyRow keys={["g", "h"]} label="履歴を開く" />
                {isAuthenticated && user?.is_superuser && (
                  <HotkeyRow keys={["g", "a"]} label="管理画面へ移動" />
                )}
                {isAuthenticated && (
                  <>
                    <HotkeyRow keys={["g", "d"]} label="ダッシュボードへ移動" />
                    <HotkeyRow keys={["g", "r"]} label="復習へ移動" />
                    <HotkeyRow keys={["g", "g"]} label="ゲームへ移動" />
                    <HotkeyRow keys={["g", "p"]} label="プロフィールへ移動" />
                    <HotkeyRow keys={["g", "n"]} label="通知へ移動" />
                    <HotkeyRow keys={["g", "i"]} label="インポートへ移動" />
                  </>
                )}
                <HotkeyRow keys={["g", "s"]} label="検索へ移動" />
                <HotkeyRow keys={["g", "q"]} label="クイズ検索へ移動" />
                <HotkeyRow keys={["l", "i"]} label="ログイン画面へ移動" />
                {isAuthenticated && (
                  <HotkeyRow keys={["l", "o"]} label="ログアウトの確認" />
                )}
                <HotkeyRow keys={["h", "l"]} label="前後のタブへ移動" />
                <HotkeyRow keys={["Ctrl", "1–9"]} label="番号のタブへ移動" />
                <HotkeyRow keys={["u", "d"]} label="ページを上下にスクロール" />
                <HotkeyRow keys={["/"]} label="ページ内の入力欄へフォーカス" />
                <HotkeyRow keys={["Esc"]} label="入力欄のフォーカスを解除" />
                <HotkeyRow keys={["?"]} label="この一覧を開く" />
              </dl>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </HotkeyContext.Provider>
  );
}

export function HotkeyHelpButton() {
  const { openHelp } = useHotkeys();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openHelp}
      aria-label="キーボードショートカットを開く"
    >
      <CircleHelp className="size-4" />
    </Button>
  );
}

export default function GlobalHotkeys() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { openHistory } = useHistoryPanel();
  const { openHelp } = useHotkeys();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const waitingForDestination = useRef<"g" | "l" | null>(null);
  const chordTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function releaseEditableFocus(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.isComposing ||
        (event.target instanceof HTMLElement &&
          event.target.closest("[data-search-settings-panel]")) ||
        !isEditableTarget(event.target)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      (event.target as HTMLElement).blur();
    }

    function resetChord() {
      waitingForDestination.current = null;
      if (chordTimer.current) clearTimeout(chordTimer.current);
      chordTimer.current = undefined;
    }

    function startChord(prefix: "g" | "l") {
      resetChord();
      waitingForDestination.current = prefix;
      chordTimer.current = setTimeout(() => {
        resetChord();
        if (
          prefix === "l" &&
          !isEditableTarget(document.activeElement) &&
          !document.querySelector(
            '[role="dialog"], [role="alertdialog"], dialog[open]',
          )
        ) {
          moveActiveTab(1);
        }
      }, CHORD_TIMEOUT_MS);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        resetChord();
        return;
      }

      const key = event.key.toLowerCase();
      const dialogOpen = document.querySelector(
        '[role="dialog"], [role="alertdialog"], dialog[open]',
      );

      // プレビュー中は背後の問題・タブを変更しない。項目移動もdialog内のみ。
      if (dialogOpen) {
        if (!event.ctrlKey && (key === "j" || key === "k")) {
          if (moveActiveItem(key === "j" ? 1 : -1, dialogOpen))
            event.preventDefault();
        }
        resetChord();
        return;
      }

      if (event.ctrlKey) {
        if (/^[1-9]$/.test(key) && activateTabByIndex(Number(key) - 1)) {
          event.preventDefault();
        }
        resetChord();
        return;
      }

      if (waitingForDestination.current === "l") {
        resetChord();
        if (key === "i" || key === "o") {
          event.preventDefault();
          if (key === "i" && !isAuthenticated) navigate("/login");
          if (key === "o" && isAuthenticated) setLogoutOpen(true);
          return;
        }
        moveActiveTab(1);
      }

      if (key === "?") {
        event.preventDefault();
        resetChord();
        openHelp();
        return;
      }

      if (key === "/") {
        resetChord();
        if (focusPageInput()) event.preventDefault();
        return;
      }
      if (!waitingForDestination.current && key === "s") {
        const settings = document.querySelector<HTMLButtonElement>(
          "[data-search-settings-trigger]",
        );
        if (settings && !settings.closest("[hidden]")) {
          event.preventDefault();
          settings.click();
        }
        resetChord();
        return;
      }

      if (!waitingForDestination.current && (key === "j" || key === "k")) {
        if (
          moveQuizTimeline(key === "j" ? 1 : -1) ||
          moveActiveItem(key === "j" ? 1 : -1, dialogOpen)
        ) {
          event.preventDefault();
        }
        resetChord();
        return;
      }

      if (!waitingForDestination.current && key === " ") {
        if (toggleActiveResourceDisclosure()) event.preventDefault();
        resetChord();
        return;
      }

      if (!waitingForDestination.current && key === "enter") {
        if (
          submitActiveQuiz() ||
          openActiveResourceManagement() ||
          runPageEnterAction()
        )
          event.preventDefault();
        resetChord();
        return;
      }

      if (!waitingForDestination.current && /^[1-9]$/.test(key)) {
        if (toggleActiveQuizOption(key)) event.preventDefault();
        resetChord();
        return;
      }

      if (!waitingForDestination.current && key === "l") {
        event.preventDefault();
        startChord("l");
        return;
      }

      if (!waitingForDestination.current && key === "h") {
        if (moveActiveTab(-1)) event.preventDefault();
        resetChord();
        return;
      }

      if (!waitingForDestination.current && (key === "u" || key === "d")) {
        if (scrollPage(key === "d" ? 1 : -1)) event.preventDefault();
        resetChord();
        return;
      }

      if (key === "g" && waitingForDestination.current !== "g") {
        startChord("g");
        return;
      }

      if (!waitingForDestination.current) return;
      resetChord();

      const actions: Record<string, (() => void) | undefined> = {
        a:
          isAuthenticated && user?.is_superuser
            ? () => navigate("/admin")
            : undefined,
        g: isAuthenticated ? () => navigate("/game") : undefined,
        h: openHistory,
        d: isAuthenticated ? () => navigate("/dashboard") : undefined,
        r: isAuthenticated ? () => navigate("/review") : undefined,
        p: user
          ? () => navigate(`/user/${user.username || user.uid}`)
          : undefined,
        n: isAuthenticated ? () => navigate("/notifications") : undefined,
        i: isAuthenticated ? () => navigate("/import") : undefined,
        s: () => navigate("/search"),
        q: () => navigate("/search?type=quiz"),
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    }

    window.addEventListener("keydown", releaseEditableFocus, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", resetChord);
    window.addEventListener("blur", resetChord);
    return () => {
      window.removeEventListener("keydown", releaseEditableFocus, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", resetChord);
      window.removeEventListener("blur", resetChord);
      resetChord();
    };
  }, [isAuthenticated, navigate, openHelp, openHistory, user]);

  return (
    <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <LogoutDialogContent />
    </Dialog>
  );
}

function ContextHotkeySection({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}) {
  const hotkeys = contextHotkeys(pathname, search);
  if (hotkeys.length === 0) return null;
  return (
    <section aria-labelledby="page-hotkeys-heading">
      <h3 id="page-hotkeys-heading" className="text-sm font-semibold">
        この画面
      </h3>
      <dl className="mt-1 divide-y">
        {hotkeys.map(({ keys, label }) => (
          <HotkeyRow
            key={`${keys.join("-")}-${label}`}
            keys={keys}
            label={label}
          />
        ))}
      </dl>
    </section>
  );
}

type HotkeyDefinition = { keys: string[]; label: string };

function contextHotkeys(pathname: string, search: string): HotkeyDefinition[] {
  if (pathname.startsWith("/user/")) {
    return [
      { keys: ["j", "k"], label: "リソースの行を移動" },
      { keys: ["Enter"], label: "選択したリソースの詳細を開く" },
      { keys: ["Space"], label: "選択した自分のリソースを復習" },
    ];
  }
  if (pathname === "/import") {
    return [{ keys: ["Enter"], label: "選択したファイルをインポート" }];
  }
  if (pathname.startsWith("/search")) {
    return [
      { keys: ["j", "k"], label: "検索結果を移動" },
      { keys: ["Enter"], label: "検索結果を開く" },
      { keys: ["s"], label: "検索設定を開く" },
    ];
  }
  if (pathname === "/study-plans") return studyPlanHotkeys;
  if (pathname === "/answers") return answerHistoryHotkeys;
  if (pathname !== "/dashboard" && pathname !== "/review") return [];
  const view =
    new URLSearchParams(search).get("view") ??
    (pathname === "/review" ? "knowledge" : "review-settings");
  if (view === "study-plans") return studyPlanHotkeys;
  if (view === "review-settings")
    return [
      { keys: ["j", "k"], label: "復習設定を移動" },
      { keys: ["Enter"], label: "選んだ設定で復習する" },
    ];
  if (view === "answers") return answerHistoryHotkeys;
  if (pathname === "/review" && view === "quiz") {
    return [
      { keys: ["j", "k"], label: "クイズを移動" },
      { keys: ["1–9"], label: "選択肢を切替" },
      { keys: ["Enter"], label: "回答する" },
    ];
  }
  if (pathname === "/review" && view === "knowledge") {
    return [
      { keys: ["j", "k"], label: "単文を移動" },
      { keys: ["Space"], label: "見たよを記録" },
      { keys: ["Enter"], label: "単文を開く" },
    ];
  }
  if (view === "notes") {
    return [
      { keys: ["j", "k"], label: "Entry・Resourceを移動" },
      { keys: ["Enter"], label: "Entryを開閉／Resourceを開く" },
    ];
  }
  if (view === "quiz-management") {
    return [
      { keys: ["j", "k"], label: "Resource・展開中のクイズを移動" },
      { keys: ["Space"], label: "currentのResourceを開閉" },
      { keys: ["Enter"], label: "currentのResourceのクイズを管理" },
    ];
  }
  return [];
}

const studyPlanHotkeys: HotkeyDefinition[] = [
  { keys: ["j", "k"], label: "currentを移動" },
  { keys: ["Space"], label: "currentのチェックを切替" },
  { keys: ["a"], label: "currentへクイズを追加" },
  { keys: ["e"], label: "currentを編集" },
  { keys: ["Enter"], label: "currentのクイズを解く" },
];

const answerHistoryHotkeys: HotkeyDefinition[] = [
  { keys: ["j", "k"], label: "回答履歴の行を移動" },
  { keys: ["Space", "Enter"], label: "選択した回答の詳細を開閉" },
];

function moveQuizTimeline(offset: -1 | 1): boolean {
  const timeline = Array.from(
    document.querySelectorAll<HTMLElement>("[data-quiz-timeline]"),
  ).find((candidate) => !candidate.closest("[hidden]"));
  if (!timeline) return false;
  const button = timeline.querySelector<HTMLButtonElement>(
    offset === 1 ? "[data-quiz-timeline-next]" : "[data-quiz-timeline-prev]",
  );
  if (!button || button.disabled) return true;
  button.click();
  return true;
}

function activeResourceDisclosure(): {
  active: HTMLElement;
  disclosure: HTMLElement;
} | null {
  const active = document.querySelector<HTMLElement>(
    '[data-resource-disclosure] [data-hotkey-item][data-hotkey-active="true"]',
  );
  const disclosure = active?.closest<HTMLElement>("[data-resource-disclosure]");
  return active && disclosure ? { active, disclosure } : null;
}

function toggleActiveResourceDisclosure(): boolean {
  const current = activeResourceDisclosure();
  const trigger = current?.disclosure.querySelector<HTMLElement>(
    "[data-resource-disclosure-trigger]",
  );
  if (!current || !trigger) return false;
  if (current.active !== trigger) {
    current.active.removeAttribute("data-hotkey-active");
    trigger.dataset.hotkeyActive = "true";
    trigger.focus({ preventScroll: true });
  }
  trigger.click();
  return true;
}

function openActiveResourceManagement(): boolean {
  const current = activeResourceDisclosure();
  const link = current?.disclosure.querySelector<HTMLElement>(
    "[data-resource-management-link]",
  );
  if (!link) return false;
  link.click();
  return true;
}

function submitActiveQuiz(): boolean {
  const active = document.querySelector<HTMLElement>(
    '[data-quiz-timeline-card] [data-hotkey-item][data-hotkey-active="true"]',
  );
  const card = active?.closest<HTMLElement>("[data-quiz-timeline-card]");
  if (!card) return false;
  if (card.dataset.quizOpen === "true") {
    const submit = card.querySelector<HTMLButtonElement>("[data-quiz-submit]");
    if (submit && !submit.disabled) submit.click();
  }
  return true;
}

function runPageEnterAction(): boolean {
  const action = document.querySelector<HTMLButtonElement>(
    "[data-page-enter-action]:not(:disabled)",
  );
  if (!action) return false;
  action.click();
  return true;
}

function scrollPage(direction: -1 | 1): boolean {
  const container = document.querySelector<HTMLElement>("main");
  if (!container) return false;
  const distance = Math.max(160, Math.round(container.clientHeight * 0.8));
  container.scrollBy({ top: direction * distance, behavior: "smooth" });
  return true;
}

function toggleActiveQuizOption(index: string): boolean {
  const active = document.querySelector<HTMLElement>(
    '[data-hotkey-item][data-hotkey-active="true"]',
  );
  const card = active?.closest<HTMLElement>("[data-quiz-timeline-card]");
  const option = card?.querySelector<HTMLButtonElement>(
    `[data-quiz-option-index="${index}"]`,
  );
  if (!option || option.disabled) return false;
  option.click();
  return true;
}

function useHotkeys() {
  const context = useContext(HotkeyContext);
  if (!context) {
    throw new Error("useHotkeys must be used within HotkeyProvider");
  }
  return context;
}

function HotkeyRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1">
        {keys.map((key, position) => (
          <kbd
            // biome-ignore lint/suspicious/noArrayIndexKey: Chord positions are fixed; repeated keys such as g g need distinct identities.
            key={`${key}-${position}`}
            className="min-w-7 rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-xs shadow-xs"
          >
            {key}
          </kbd>
        ))}
      </dd>
    </div>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}

function moveActiveTab(offset: -1 | 1): boolean {
  const activeTab = document.querySelector<HTMLElement>(
    '[role="tab"][aria-selected="true"]',
  );
  const tabList = activeTab?.closest('[role="tablist"]');
  if (!activeTab || !tabList) return false;

  const tabs = Array.from(
    tabList.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
  );
  const currentIndex = tabs.indexOf(activeTab);
  if (currentIndex < 0 || tabs.length < 2) return false;

  const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
  const nextTab = tabs[nextIndex];
  nextTab?.focus();
  nextTab?.click();
  return Boolean(nextTab);
}

function activateTabByIndex(index: number): boolean {
  const tabLists = Array.from(document.querySelectorAll('[role="tablist"]'));
  const visibleTabList = tabLists.find(
    (element) => !element.closest("[hidden]"),
  );
  const tab = visibleTabList?.querySelectorAll<HTMLElement>(
    '[role="tab"]:not([disabled])',
  )[index];
  if (!tab) return false;
  tab.focus();
  tab.click();
  return true;
}

function moveActiveItem(offset: -1 | 1, dialog: Element | null): boolean {
  const scope = dialog ?? document;
  const items = Array.from(
    scope.querySelectorAll<HTMLElement>("[data-hotkey-item]"),
  ).filter((item) => !item.closest("[hidden]"));
  if (items.length === 0) return false;

  const focusedIndex = items.indexOf(document.activeElement as HTMLElement);
  const markedIndex = items.findIndex(
    (item) => item.dataset.hotkeyActive === "true",
  );
  const currentIndex = focusedIndex >= 0 ? focusedIndex : markedIndex;
  const nextIndex =
    currentIndex < 0
      ? offset === 1
        ? 0
        : items.length - 1
      : (currentIndex + offset + items.length) % items.length;
  const nextItem = items[nextIndex];
  if (!nextItem) return false;
  for (const item of items) item.removeAttribute("data-hotkey-active");
  nextItem.dataset.hotkeyActive = "true";
  nextItem.focus();
  nextItem.scrollIntoView({ block: "nearest" });
  return true;
}

function focusPageInput(): boolean {
  const inputs = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]',
    ),
  );
  const visibleInputs = inputs.filter((element) => {
    const style = window.getComputedStyle(element);
    return (
      !element.hasAttribute("disabled") &&
      !element.closest("[hidden]") &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
  const input =
    visibleInputs.find((element) =>
      element.hasAttribute("data-page-input-priority"),
    ) ?? visibleInputs[0];
  if (!input) return false;
  input.focus();
  if (
    input instanceof HTMLInputElement ||
    input instanceof HTMLTextAreaElement
  ) {
    input.select();
  }
  return true;
}
