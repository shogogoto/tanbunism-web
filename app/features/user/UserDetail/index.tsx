import { ChevronDown, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import { useResourceGrowth } from "~/features/gamification/ResourceGrowth";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Progress } from "~/shared/components/ui/progress";
import type {
  LearningProgress,
  NameSpace,
  XpSource,
} from "~/shared/generated/fastAPI.schemas";
import { cn } from "~/shared/lib/utils";
import UserProfile from "../UserProfile";
import type { UserProps } from "../types";
import ResourceShelf, { shelfResources } from "./ResourceShelf";

type Props = UserProps &
  React.PropsWithChildren & {
    namespace: NameSpace;
    learningProgress: LearningProgress;
  };

export default function UserDetail({
  user,
  children,
  namespace,
  learningProgress,
}: Props) {
  const { user: currentUser } = useAuth();
  const isOwnProfile =
    !!currentUser &&
    currentUser.uid.replaceAll("-", "").toLowerCase() ===
      user?.uid.replaceAll("-", "").toLowerCase();
  const growth = useResourceGrowth(user?.uid);
  const ownedIds = new Set(
    shelfResources(namespace).map((resource) =>
      resource.uid.replaceAll("-", "").toLowerCase(),
    ),
  );
  const ownedGrowth = growth.data?.resources.filter((resource) =>
    ownedIds.has(resource.resource_id.replaceAll("-", "").toLowerCase()),
  );
  const power = ownedGrowth?.reduce((sum, resource) => sum + resource.power, 0);
  const reviewXp = ownedGrowth?.reduce(
    (sum, resource) => sum + resource.total_xp,
    0,
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {children}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid items-start gap-6 md:grid-cols-2">
            <UserProfile
              user={user}
              avatarAction={
                isOwnProfile ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full border bg-background shadow-sm"
                  >
                    <Link to="/user/edit" aria-label="プロフィールを編集">
                      <Settings className="size-4" />
                    </Link>
                  </Button>
                ) : undefined
              }
            />
            <section
              className="space-y-3"
              aria-label="プロフィールのステータス"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-3xl font-semibold tabular-nums">
                  Lv. {learningProgress.level}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Lvの根拠
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
                    aria-describedby={undefined}
                  >
                    <DialogHeader>
                      <DialogTitle>ユーザーLvの根拠</DialogTitle>
                    </DialogHeader>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      ユーザーLvには知識の整理・クイズ作成・過去の回答も含みます。本棚の各Lvは、記録開始後の復習XPで育ちます。
                    </p>
                    <LearningLevel
                      progress={learningProgress}
                      embedded
                      defaultDetailsOpen
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <Progress
                value={
                  (100 * learningProgress.current_level_xp) /
                  Math.max(1, learningProgress.xp_for_next_level)
                }
                aria-label="ユーザーのレベル進捗"
              />
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {learningProgress.current_level_xp.toLocaleString("ja-JP")} /{" "}
                {learningProgress.xp_for_next_level.toLocaleString("ja-JP")} XP
              </p>
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">本棚のPower</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {power?.toLocaleString("ja-JP") ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    論理・参照の整理
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">本棚の復習XP</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {reviewXp?.toLocaleString("ja-JP") ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    記録開始後の合計
                  </p>
                </div>
              </div>
            </section>
          </div>
          <LearningSummary namespace={namespace} compact />
        </CardContent>
      </Card>

      <ResourceShelf
        namespace={namespace}
        growth={growth.data}
        loading={growth.isLoading}
        error={growth.error}
        own={isOwnProfile}
        onRetry={() => void growth.mutate()}
      />
    </main>
  );
}

export function LearningLevel({
  progress,
  embedded = false,
  defaultDetailsOpen = false,
}: {
  progress: LearningProgress;
  embedded?: boolean;
  defaultDetailsOpen?: boolean;
}) {
  const [isXpDetailsOpen, setIsXpDetailsOpen] = useState(defaultDetailsOpen);
  const percentage =
    progress.xp_for_next_level === 0
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            (progress.current_level_xp / progress.xp_for_next_level) * 100,
          ),
        );
  const currentThreshold = progress.total_xp - progress.current_level_xp;
  const nextThreshold = progress.total_xp + progress.xp_to_next_level;

  const content = (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">学習レベル</h2>
        <p className="text-2xl font-semibold tabular-nums">
          Lv. {progress.level}
        </p>
      </div>
      <Progress value={percentage} aria-label={`レベル進捗 ${percentage}%`} />
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          累計 {progress.total_xp.toLocaleString("ja-JP")} XP
        </span>
        <span className="text-right tabular-nums">
          次のレベルまで {progress.xp_to_next_level.toLocaleString("ja-JP")} XP
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-3 text-xs">
        <div>
          <p className="text-muted-foreground">現在の到達基準</p>
          <p className="font-medium tabular-nums">
            Lv. {progress.level}：累計{" "}
            {currentThreshold.toLocaleString("ja-JP")} XP以上
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">次の到達基準</p>
          <p className="font-medium tabular-nums">
            Lv. {progress.level + 1}：累計{" "}
            {nextThreshold.toLocaleString("ja-JP")} XP
          </p>
        </div>
      </div>
      <Collapsible open={isXpDetailsOpen} onOpenChange={setIsXpDetailsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-between px-0 py-2 text-sm"
          >
            XPの加点ルールと獲得内訳
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                isXpDetailsOpen && "rotate-180",
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1">
          <p className="pb-2 text-xs text-muted-foreground">
            活動1回あたりのXPと、現在までの獲得量です。
          </p>
          <div className="divide-y rounded-md border px-3">
            {(progress.xp_details ?? []).map((detail) => {
              const presentation = xpSourcePresentation[detail.source];
              return (
                <div
                  key={detail.source}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {presentation.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {detail.activity_count.toLocaleString("ja-JP")}
                      {presentation.unit} × {detail.xp_per_activity} XP
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    +{detail.earned_xp.toLocaleString("ja-JP")} XP
                  </span>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  if (embedded) {
    return <section className="border-t pt-4">{content}</section>;
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">{content}</CardContent>
    </Card>
  );
}

const xpSourcePresentation: Record<XpSource, { label: string; unit: string }> =
  {
    knowledge: { label: "知識の整理", unit: "文" },
    quiz_creation: { label: "クイズ作成", unit: "問" },
    quiz_answer: { label: "クイズ回答", unit: "回" },
    correct_bonus: { label: "正解ボーナス", unit: "回" },
    tanbun_exposure: { label: "見たよ", unit: "日" },
  };

export function LearningSummary({
  namespace,
  compact = false,
}: { namespace: NameSpace; compact?: boolean }) {
  const summary = useMemo(() => {
    const stats = Object.values(namespace.stats ?? {});
    return {
      resources: stats.length,
      sentences: stats.reduce((sum, item) => sum + item.n_sentence, 0),
      terms: stats.reduce((sum, item) => sum + item.n_term, 0),
      chars: stats.reduce((sum, item) => sum + item.n_char, 0),
    };
  }, [namespace.stats]);

  const items = [
    ["Resources", summary.resources],
    ["単文", summary.sentences],
    ["用語", summary.terms],
    ["文字", summary.chars],
  ] as const;

  if (compact)
    return (
      <dl className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        {items.map(([label, value]) => (
          <div key={label} className="flex gap-1.5">
            <dt>{label}</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {value.toLocaleString("ja-JP")}
            </dd>
          </div>
        ))}
      </dl>
    );

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-2 pt-6 sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {value.toLocaleString("ja-JP")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
