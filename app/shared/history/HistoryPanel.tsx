import { History as HistoryIcon } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "~/shared/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/shared/components/ui/sheet";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/shared/components/ui/sidebar";
import { useHistory } from "./hooks";
import { HistoryList } from "./index";

export function HistoryPanel() {
  const [open, setOpen] = useState(false);
  const { histories } = useHistory();
  const { isMobile, setOpenMobile } = useSidebar();

  const openPanel = () => {
    setOpen(true);
  };

  const selectHistory = () => {
    setOpen(false);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip="履歴"
          onClick={openPanel}
          aria-label="履歴を開く"
        >
          <HistoryIcon />
          <span>履歴</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="p-0">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>履歴</SheetTitle>
            <SheetDescription>
              最近開いたページ {histories.length}件
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
            <HistoryList histories={histories} onSelect={selectHistory} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
