import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { NamespaceTree } from "~/features/namespace/components/NamespaceExplorer";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import { Progress } from "~/shared/components/ui/progress";
import type {
  LearningProgress,
  NameSpace,
  XpSource,
} from "~/shared/generated/fastAPI.schemas";
import { cn } from "~/shared/lib/utils";
import UserProfile from "../UserProfile";
import type { UserProps } from "../types";

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
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {children}
      <Card>
        <CardContent className="pt-6">
          <UserProfile user={user} />
        </CardContent>
      </Card>

      <LearningLevel progress={learningProgress} />

      <LearningSummary namespace={namespace} />

      <Card>
        <CardHeader>
          <CardTitle>読書メモ</CardTitle>
          <CardDescription>公開されているEntryとResource</CardDescription>
        </CardHeader>
        <CardContent>
          {namespace.g?.nodes?.length ? (
            <NamespaceTree data={namespace} readOnly />
          ) : (
            <p className="text-sm text-muted-foreground">
              まだ読書メモがありません。
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function LearningLevel({
  progress,
  embedded = false,
}: {
  progress: LearningProgress;
  embedded?: boolean;
}) {
  const [isXpDetailsOpen, setIsXpDetailsOpen] = useState(false);
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
        <div>
          <h2 className="font-semibold">学習レベル</h2>
          <p className="text-sm text-muted-foreground">
            学習活動から得た累計XPで決まります
          </p>
        </div>
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
  };

export function LearningSummary({ namespace }: { namespace: NameSpace }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>学習の蓄積</CardTitle>
        <CardDescription>読書メモから整理した知識量</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
