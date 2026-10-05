import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { useDebounce } from "~/shared/hooks/useDebounce";
import SearchSettingsPanel from "./SearchSettings";
import {
  type SearchType,
  defaultSearchSettings,
  readSearchSettings,
  searchTypes,
  writeSearchSettings,
} from "./settings";

const labels: Record<SearchType, string> = {
  knowledge: "知識",
  resource: "リソース",
  user: "ユーザー",
  quiz: "クイズ",
};

const activeTypeStyles: Record<SearchType, string> = {
  knowledge:
    "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
  resource:
    "text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300",
  user: "text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300",
  quiz: "text-emerald-600 dark:text-emerald-400",
};

export default function SearchHeaderControls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const query = searchParams.get("q") ?? "";
  const [draftQuery, setDraftQuery] = useState(query);
  const debouncedQuery = useDebounce(draftQuery, 250);
  const currentType = useMemo(
    () => parseSearchType(searchParams.get("type")),
    [searchParams],
  );
  const committedQueryRef = useRef<string | undefined>(undefined);
  const settings = useMemo(
    () => readSearchSettings(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );

  useEffect(() => {
    if (committedQueryRef.current === query) {
      committedQueryRef.current = undefined;
      return;
    }
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery === query) return;
    committedQueryRef.current = debouncedQuery;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, query, setSearchParams]);

  function updateParams(update: (next: URLSearchParams) => void) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        update(next);
        return next;
      },
      { replace: true },
    );
  }

  function selectType(type: SearchType) {
    updateParams((next) => {
      if (type === "knowledge") next.delete("type");
      else next.set("type", type);
      next.delete("types");
    });
  }

  return (
    <div className="border-t px-3 pb-3 pt-3 md:px-6">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-5 text-muted-foreground" />
          <Input
            type="search"
            data-global-search-input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="知識、リソース、ユーザー、クイズを検索"
            aria-label="検索"
            className="pl-10 pr-12"
          />
          <div className="absolute right-1 top-1">
            {currentType !== "quiz" && (
              <SearchSettingsPanel
                currentType={currentType}
                settings={settings}
                onChange={(nextSettings) =>
                  setSearchParams(
                    (current) => writeSearchSettings(current, nextSettings),
                    { replace: true },
                  )
                }
                onReset={() =>
                  setSearchParams(
                    (current) =>
                      writeSearchSettings(current, defaultSearchSettings),
                    { replace: true },
                  )
                }
              />
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-1"
          role="tablist"
          aria-label="検索対象"
        >
          {searchTypes.map((type, index) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="ghost"
              role="tab"
              aria-label={labels[type]}
              title={`Ctrl+${index + 1}`}
              className={`h-8 gap-1.5 rounded-md px-2 text-xs transition-all ${
                currentType === type
                  ? `bg-accent font-medium ring-1 ring-inset ring-foreground/70 ${activeTypeStyles[type]}`
                  : "text-muted-foreground opacity-55"
              }`}
              aria-selected={currentType === type}
              onClick={() => selectType(type)}
            >
              <kbd className="min-w-3 text-center font-mono text-[10px] leading-none text-muted-foreground">
                {index + 1}
              </kbd>
              {labels[type]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseSearchType(value: string | null): SearchType {
  return searchTypes.includes(value as SearchType)
    ? (value as SearchType)
    : "knowledge";
}
