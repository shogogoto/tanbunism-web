import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
} from "react";
import useSWR from "swr";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";

export type Growth = {
  resource_id: string;
  resource_name?: string;
  total_xp: number;
  level: number;
  current_level_xp: number;
  xp_for_next_level: number;
  power: number;
  logic_count: number;
  reference_count: number;
  last_reviewed_on?: string | null;
  exposure_xp?: number;
  answer_xp?: number;
  correct_bonus_xp?: number;
  recent_xp: {
    source: string;
    xp: number;
    subject: string;
    earned_on: string;
  }[];
};
export type GrowthResult = {
  resources: Growth[];
  rules: {
    exposure_xp: number;
    answer_xp: number;
    correct_bonus_xp: number;
    level_xp_coefficient: number;
  };
};
const GrowthContext = createContext<
  { data?: GrowthResult; error?: Error; loading: boolean } | undefined
>(undefined);
export const RESOURCE_GROWTH_CACHE_KEY = "resource-growth";
const api = import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export function useResourceGrowth(userId?: string) {
  const { user, isAuthenticated } = useAuth();
  const targetId = (userId ?? (isAuthenticated ? user?.uid : undefined))
    ?.replaceAll("-", "")
    .toLowerCase();
  const own =
    isAuthenticated && user?.uid.replaceAll("-", "").toLowerCase() === targetId;
  return useSWR<GrowthResult>(
    targetId
      ? [own ? RESOURCE_GROWTH_CACHE_KEY : "public-resource-growth", targetId]
      : null,
    async () => {
      const endpoint = own ? "me" : encodeURIComponent(targetId ?? "");
      const response = await fetch(`${api}/user/${endpoint}/resource-growth`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Lv・Powerを取得できませんでした。");
      return (await response.json()) as GrowthResult;
    },
    { revalidateOnFocus: true, dedupingInterval: 10_000 },
  );
}

export function ResourceGrowthProvider({
  children,
  active = true,
}: PropsWithChildren<{ active?: boolean }>) {
  const { data, error, isLoading, mutate } = useResourceGrowth();
  useEffect(() => {
    if (active) void mutate();
  }, [active, mutate]);
  return (
    <GrowthContext.Provider value={{ data, error, loading: isLoading }}>
      {children}
    </GrowthContext.Provider>
  );
}

const sourceNames: Record<string, string> = {
  tanbun_exposure: "見たよ",
  quiz_answer: "クイズ回答",
  correct_bonus: "正解ボーナス",
};

export default function ResourceGrowthBadge({
  resourceId,
}: { resourceId: string }) {
  const context = useContext(GrowthContext);
  if (!context) return null;
  const growth = context.data?.resources.find(
    (resource) =>
      resource.resource_id.replaceAll("-", "") ===
      resourceId.replaceAll("-", ""),
  );
  if (!growth || !context.data) {
    return (
      <span
        className="self-center text-xs text-muted-foreground"
        title={context.error?.message}
      >
        {context.loading ? "Lv…" : context.error ? "Lv取得失敗" : ""}
      </span>
    );
  }
  const rules = context.data.rules;
  const nextXp = growth.xp_for_next_level - growth.current_level_xp;
  const percent = Math.min(
    100,
    (growth.current_level_xp / growth.xp_for_next_level) * 100,
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="LvとPowerの内訳"
          className="flex shrink-0 flex-col justify-center gap-1 rounded-sm px-2 text-xs tabular-nums hover:bg-accent"
        >
          <span>
            Lv.{growth.level}{" "}
            <span className="text-muted-foreground">Power {growth.power}</span>
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full bg-primary"
                style={{ width: `${percent}%` }}
              />
            </span>
            {growth.current_level_xp}/{growth.xp_for_next_level}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 text-sm">
        <div>
          <p className="font-semibold">
            復習 Lv.{growth.level} · 累計 {growth.total_xp} XP
          </p>
          <p className="text-xs text-muted-foreground">
            次のLvまで {nextXp} XP
          </p>
        </div>
        <div>
          <p>Power {growth.power}</p>
          <p className="text-xs text-muted-foreground">
            論理 {growth.logic_count} ＋ 参照 {growth.reference_count}
            。詳細・文字数は加点しません。
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            見たよ +{rules.exposure_xp}／回答 +{rules.answer_xp}／正解 +
            {rules.correct_bonus_xp} XP
          </p>
          <p>
            同じ対象・種別は一日一回。次のLvまで：現在Lv ×{" "}
            {rules.level_xp_coefficient} XP。
          </p>
          <p>
            復習XPは導入後から記録します。ユーザーXPは各リソースの合計です。
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium">最近のXP</p>
          {growth.recent_xp.length ? (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {growth.recent_xp.map((event, index) => (
                <li
                  key={`${event.earned_on}-${event.source}-${index}`}
                  className="text-xs"
                >
                  <div className="flex justify-between">
                    <span>
                      {event.earned_on} ·{" "}
                      {sourceNames[event.source] ?? event.source}
                    </span>
                    <span>+{event.xp} XP</span>
                  </div>
                  <p
                    className="truncate text-muted-foreground"
                    title={event.subject}
                  >
                    {event.subject}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              まだ復習の記録はありません。
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
