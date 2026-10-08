import { Check, ChevronsUpDown, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import { Button } from "~/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";
import {
  defaultSettings,
  presetStorageKey,
  useReviewSettings,
} from "./settings";
import { useReviewPlans } from "./useReviewPlans";

export default function ReviewSettingsSelector({
  selected,
  onSelect,
  recentDays = [],
  selectedDay,
  onSelectDay,
}: {
  selected: string;
  onSelect: (id: string) => void;
  recentDays?: string[];
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
}) {
  const { user } = useAuth();
  const { data, error } = useReviewSettings();
  const { data: plans, error: plansError } = useReviewPlans();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const settings = data ?? [
    defaultSettings,
    ...(selected !== "default" && !selected.startsWith("plan:")
      ? [{ id: selected, name: "読み込み中…" }]
      : []),
  ];
  const groups = [
    ...(onSelectDay && recentDays.length
      ? [
          {
            name: "復習日",
            items: recentDays.map((day, index) => ({
              id: `day:${day}`,
              name: index === 0 ? "今日" : index === 1 ? `昨日（${day}）` : day,
            })),
          },
        ]
      : []),
    {
      name: "今日・自作設定",
      items: settings.map((setting) => ({
        ...setting,
        name:
          recentDays.length && setting.id === "default"
            ? "日替わりの推薦"
            : setting.name,
      })),
    },
    {
      name: "StudyPlan（リソース別）",
      items:
        plans?.map((plan) => ({ id: `plan:${plan.uid}`, name: plan.name })) ??
        [],
    },
  ];
  const presetName =
    groups.flatMap((group) => group.items).find((item) => item.id === selected)
      ?.name ?? (plansError ? "計画を取得できません" : "読み込み中…");
  const dayName = groups
    .flatMap((group) => group.items)
    .find((item) => item.id === `day:${selectedDay}`)?.name;
  const selectedName =
    selected.startsWith("plan:") || !dayName
      ? presetName
      : selected === "default"
        ? dayName
        : `${presetName} · ${dayName}`;
  const selectedItem =
    !selected.startsWith("plan:") && dayName ? `day:${selectedDay}` : selected;
  useEffect(() => {
    if (
      !selected.startsWith("plan:") &&
      data &&
      !data.some((setting) => setting.id === selected)
    )
      onSelect("default");
  }, [data, selected, onSelect]);
  useEffect(() => {
    if (!user || selected.startsWith("plan:")) return;
    try {
      localStorage.setItem(presetStorageKey(user.uid), selected);
    } catch {
      /* 保存不可でも復習は継続できる */
    }
  }, [user, selected]);
  return (
    <div
      className="flex min-w-0 items-center gap-1 text-sm"
      data-dashboard-swipe-ignore
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="復習設定を切り替え"
            className="h-11 min-w-0 max-w-24 gap-1 px-2 sm:h-9 sm:max-w-60"
            title={selectedName}
          >
            <span className="truncate">{selectedName}</span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-96 max-w-[calc(100vw-2rem)] p-0"
          data-dashboard-swipe-ignore
        >
          <Command
            label="復習対象を絞り込む"
            defaultValue={selectedItem}
            filter={(_value, search, keywords) => {
              const normalize = (text: string) =>
                text.normalize("NFKC").toLocaleLowerCase();
              return normalize(keywords?.join(" ") ?? "").includes(
                normalize(search.trim()),
              )
                ? 1
                : 0;
            }}
          >
            <CommandInput
              aria-label="復習対象を絞り込む"
              placeholder="名前で絞り込む"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[min(300px,calc(var(--radix-popover-content-available-height)-3rem))]">
              <CommandEmpty>該当する対象はありません</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.name} heading={group.name}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      keywords={[item.name, group.name]}
                      onSelect={() => {
                        if (item.id.startsWith("day:"))
                          onSelectDay?.(item.id.slice(4));
                        else onSelect(item.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="items-start"
                    >
                      <Check
                        aria-hidden="true"
                        className={
                          item.id === selectedItem ||
                          (selected !== "default" && item.id === selected)
                            ? "mt-0.5 size-4"
                            : "mt-0.5 size-4 opacity-0"
                        }
                      />
                      <span className="min-w-0 whitespace-normal break-words">
                        {item.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Link
        to={
          selected.startsWith("plan:")
            ? "/dashboard?view=study-plans"
            : "/dashboard?view=review-settings"
        }
        aria-label={
          selected.startsWith("plan:") ? "学習計画を管理" : "設定を管理"
        }
        title={selected.startsWith("plan:") ? "学習計画を管理" : "設定を管理"}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-9"
      >
        <Settings className="size-4" aria-hidden="true" />
      </Link>
      {(error || plansError) && (
        <span role="alert" className="text-xs text-destructive">
          設定一覧の取得に失敗
        </span>
      )}
    </div>
  );
}
