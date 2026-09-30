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
  const { isAuthenticated } = useAuth();
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
          <dl className="divide-y">
            <HotkeyRow keys={["g", "h"]} label="履歴を開く" />
            {isAuthenticated && (
              <>
                <HotkeyRow keys={["g", "d"]} label="ダッシュボードへ移動" />
                <HotkeyRow keys={["g", "p"]} label="プロフィールへ移動" />
                <HotkeyRow keys={["g", "n"]} label="通知へ移動" />
                <HotkeyRow keys={["g", "+"]} label="読書メモを取り込む" />
              </>
            )}
            <HotkeyRow keys={["g", "s"]} label="検索へ移動" />
            <HotkeyRow keys={["g", "q"]} label="クイズへ移動" />
            <HotkeyRow keys={["h", "l"]} label="前後のタブへ移動" />
            <HotkeyRow keys={["j", "k"]} label="項目を移動" />
            <HotkeyRow
              keys={["1", "2", "3", "4"]}
              label="クイズの選択肢を切替"
            />
            <HotkeyRow keys={["Enter"]} label="選択した項目を開く" />
            <HotkeyRow keys={["/"]} label="検索入力へフォーカス" />
            <HotkeyRow keys={["?"]} label="この一覧を開く" />
          </dl>
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
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { openHistory } = useHistoryPanel();
  const { openHelp } = useHotkeys();
  const waitingForDestination = useRef(false);
  const chordTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const focusSearchAfterNavigation = useRef(false);

  useEffect(() => {
    if (
      !focusSearchAfterNavigation.current ||
      !pathname.startsWith("/search")
    ) {
      return;
    }
    focusSearchAfterNavigation.current = false;
    requestAnimationFrame(focusSearchInput);
  }, [pathname]);

  useEffect(() => {
    function resetChord() {
      waitingForDestination.current = false;
      if (chordTimer.current) clearTimeout(chordTimer.current);
      chordTimer.current = undefined;
    }

    function startChord() {
      resetChord();
      waitingForDestination.current = true;
      chordTimer.current = setTimeout(resetChord, CHORD_TIMEOUT_MS);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        resetChord();
        return;
      }

      const key = event.key.toLowerCase();
      const dialogOpen = document.querySelector('[role="dialog"]');

      if (key === "?" && !dialogOpen) {
        event.preventDefault();
        resetChord();
        openHelp();
        return;
      }

      if (key === "/") {
        event.preventDefault();
        resetChord();
        if (pathname.startsWith("/search")) {
          focusSearchInput();
        } else {
          focusSearchAfterNavigation.current = true;
          navigate("/search");
        }
        return;
      }

      if (!waitingForDestination.current && (key === "j" || key === "k")) {
        if (moveActiveItem(key === "j" ? 1 : -1, dialogOpen)) {
          event.preventDefault();
        }
        resetChord();
        return;
      }

      if (!waitingForDestination.current && /^[1-9]$/.test(key)) {
        if (toggleActiveQuizOption(key)) event.preventDefault();
        resetChord();
        return;
      }

      if (dialogOpen) {
        resetChord();
        return;
      }

      if (!waitingForDestination.current && (key === "h" || key === "l")) {
        if (moveActiveTab(key === "l" ? 1 : -1)) event.preventDefault();
        resetChord();
        return;
      }

      if (key === "g") {
        startChord();
        return;
      }

      if (!waitingForDestination.current) return;
      resetChord();

      const actions: Record<string, (() => void) | undefined> = {
        h: openHistory,
        d: isAuthenticated ? () => navigate("/dashboard") : undefined,
        p: user
          ? () => navigate(`/user/${user.username || user.uid}`)
          : undefined,
        n: isAuthenticated ? () => navigate("/notifications") : undefined,
        "+": isAuthenticated ? () => navigate("/import") : undefined,
        s: () => navigate("/search"),
        q: () => navigate("/quiz"),
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resetChord();
    };
  }, [isAuthenticated, navigate, openHelp, openHistory, pathname, user]);

  return null;
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
        {keys.map((key) => (
          <kbd
            key={key}
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

function moveActiveItem(offset: -1 | 1, dialog: Element | null): boolean {
  const scope = dialog ?? document;
  const items = Array.from(
    scope.querySelectorAll<HTMLElement>("[data-hotkey-item]"),
  ).filter((item) => !item.closest("[hidden]"));
  if (items.length === 0) return false;

  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
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

function focusSearchInput() {
  document
    .querySelector<HTMLInputElement>("[data-global-search-input]")
    ?.focus();
}
