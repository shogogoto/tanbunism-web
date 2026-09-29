import { History as HistoryIcon } from "lucide-react";
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useRef,
  useState,
} from "react";
import { Button } from "~/shared/components/ui/button";
import { ScrollArea } from "~/shared/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/shared/components/ui/sheet";
import { useHistory } from "./hooks";
import { HistoryList } from "./index";

type HistoryPanelContextValue = {
  openHistory: () => void;
};

const HistoryPanelContext = createContext<HistoryPanelContextValue | null>(
  null,
);

export function HistoryPanelProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const { histories } = useHistory();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <HistoryPanelContext.Provider value={{ openHistory: () => setOpen(true) }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          ref={contentRef}
          className="p-0"
          onOpenAutoFocus={(event) => {
            const firstHistory = contentRef.current?.querySelector<HTMLElement>(
              "[data-history-item]",
            );
            if (!firstHistory) return;
            event.preventDefault();
            firstHistory.focus();
          }}
        >
          <SheetHeader className="border-b pr-12">
            <SheetTitle>履歴</SheetTitle>
            <SheetDescription>
              最近開いたページ {histories.length}件
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
            <HistoryList
              histories={histories}
              onSelect={() => setOpen(false)}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </HistoryPanelContext.Provider>
  );
}

export function useHistoryPanel() {
  const context = useContext(HistoryPanelContext);
  if (!context) {
    throw new Error("useHistoryPanel must be used within HistoryPanelProvider");
  }
  return context;
}

export function HistoryPanel() {
  const { openHistory } = useHistoryPanel();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={openHistory}
      aria-label="履歴を開く"
      title="履歴"
    >
      <HistoryIcon />
    </Button>
  );
}
