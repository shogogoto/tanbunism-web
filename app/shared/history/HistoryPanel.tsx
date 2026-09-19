import { History as HistoryIcon } from "lucide-react";
import { useState } from "react";
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

export function HistoryPanel({ showLabel = false }: { showLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const { histories } = useHistory();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        onClick={() => setOpen(true)}
        aria-label="履歴を開く"
      >
        <HistoryIcon />
        {showLabel && <span className="hidden sm:inline">履歴</span>}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="p-0">
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
    </>
  );
}
