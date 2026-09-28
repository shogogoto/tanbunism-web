import { Search } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
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
};

export default function SearchHeaderControls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const enabledTypes = useMemo(
    () => parseSearchTypes(searchParams.get("types")),
    [searchParams],
  );
  const settings = useMemo(
    () => readSearchSettings(searchParams),
    [searchParams],
  );

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

  function toggleType(type: SearchType) {
    const nextTypes = enabledTypes.includes(type)
      ? enabledTypes.filter((item) => item !== type)
      : [...enabledTypes, type];
    if (nextTypes.length === 0) return;
    updateParams((next) => {
      if (nextTypes.length === searchTypes.length) next.delete("types");
      else next.set("types", nextTypes.join(","));
    });
  }

  return (
    <div className="border-t px-3 pb-3 pt-3 md:px-6">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-5 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) =>
              updateParams((next) => {
                if (event.target.value) next.set("q", event.target.value);
                else next.delete("q");
              })
            }
            placeholder="知識、リソース、ユーザーを検索"
            aria-label="検索"
            className="pl-10 pr-12"
          />
          <div className="absolute right-1 top-1">
            <SearchSettingsPanel
              enabledTypes={enabledTypes}
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
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-1"
          aria-label="検索対象"
        >
          {searchTypes.map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="ghost"
              className={`h-7 gap-1.5 px-2 text-xs ${
                enabledTypes.includes(type)
                  ? "font-medium text-foreground"
                  : "text-muted-foreground opacity-55"
              }`}
              aria-pressed={enabledTypes.includes(type)}
              onClick={() => toggleType(type)}
            >
              <span
                className={`size-1.5 rounded-full ${
                  enabledTypes.includes(type)
                    ? "bg-current"
                    : "border border-current"
                }`}
              />
              {labels[type]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseSearchTypes(value: string | null): SearchType[] {
  if (!value) return [...searchTypes];
  const parsed = value
    .split(",")
    .filter((type): type is SearchType =>
      searchTypes.includes(type as SearchType),
    );
  return parsed.length > 0 ? parsed : [...searchTypes];
}
