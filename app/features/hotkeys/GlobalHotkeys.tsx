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
              <HotkeyRow keys={["g", "d"]} label="ダッシュボードへ移動" />
            )}
            <HotkeyRow keys={["g", "s"]} label="検索へ移動" />
            <HotkeyRow keys={["g", "q"]} label="クイズへ移動" />
            <HotkeyRow keys={["[", "]"]} label="前後のタブへ移動" />
            <HotkeyRow keys={["↑", "↓"]} label="履歴の項目を移動" />
            <HotkeyRow keys={["Enter"]} label="選択した履歴を開く" />
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
  const { isAuthenticated } = useAuth();
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

      if (dialogOpen) {
        resetChord();
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

      if (key === "[" || key === "]") {
        if (moveActiveTab(key === "]" ? 1 : -1)) event.preventDefault();
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
  }, [isAuthenticated, navigate, openHelp, openHistory, pathname]);

  return null;
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

function focusSearchInput() {
  document
    .querySelector<HTMLInputElement>("[data-global-search-input]")
    ?.focus();
}
