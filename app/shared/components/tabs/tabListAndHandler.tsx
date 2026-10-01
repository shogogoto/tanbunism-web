import type React from "react";
import { useSwipeable } from "react-swipeable";
import { TabsList, TabsTrigger } from "~/shared/components/ui/tabs";

// TabItemからcontentを除外したUI用の型
export type TabUiItem = {
  value: string;
  tab: React.ReactNode;
  className?: string;
};

type Props = {
  items: TabUiItem[];
  value: string;
  onValueChange: (value: string) => void;
  headerContent?: React.ReactNode; // 元のTabPageのchildrenに相当
};

export default function tabListAndHandler({
  items,
  value,
  onValueChange,
}: Props) {
  const validTabs = items.map((item) => item.value);

  const tabHandler = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = validTabs.indexOf(value);
      if (currentIndex < validTabs.length - 1) {
        onValueChange(validTabs[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = validTabs.indexOf(value);
      if (currentIndex > 0) {
        onValueChange(validTabs[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const nTab = items.length;
  const tabTriggers = items.map((item, index) => (
    <TabsTrigger value={item.value} key={item.value} className={item.className}>
      {index < 9 && (
        <kbd className="mr-1.5 hidden font-mono text-[10px] font-normal text-muted-foreground sm:inline">
          {index + 1}
        </kbd>
      )}
      {item.tab}
    </TabsTrigger>
  ));

  const tabList =
    nTab > 4 ? (
      <div className="w-full overflow-x-auto border-b">
        <TabsList className="rounded-none">{tabTriggers}</TabsList>
      </div>
    ) : (
      <TabsList
        className="grid w-full rounded-none"
        style={{ gridTemplateColumns: `repeat(${nTab}, 1fr)` }}
      >
        {tabTriggers}
      </TabsList>
    );
  return { tabList, tabHandler };
}
