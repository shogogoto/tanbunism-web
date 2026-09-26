import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { NamespaceTree } from "~/features/namespace/components/NamespaceExplorer";
import Loading from "~/shared/components/Loading";
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
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";
import type { getArchievementHistoryUserArchievementHistoryPostResponse } from "~/shared/generated/public-user/public-user";
import { cn } from "~/shared/lib/utils";
import AchieveHistoryChart from "../AchieveHistory";
import AchieveHistoryTable from "../AchieveHistory/HistoryTable";
import UserProfile from "../UserProfile";
import type { UserProps } from "../types";

type Props = UserProps &
  React.PropsWithChildren & {
    achievementsData:
      | getArchievementHistoryUserArchievementHistoryPostResponse
      | undefined;
    namespace: NameSpace;
    isLoading: boolean;
  };

export default function UserDetail({
  user,
  children,
  achievementsData,
  namespace,
  isLoading,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      {children}
      <Card>
        <CardContent className="pt-6">
          <UserProfile user={user} />
        </CardContent>
      </Card>

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

      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>活動の推移</CardTitle>
              <CardDescription>知識量のこれまでの変化</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="活動の推移を開閉">
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <Loading type="center-x" />
              ) : achievementsData?.data && achievementsData.status === 200 ? (
                <div className="flex flex-col space-y-10">
                  <AchieveHistoryChart aHistories={achievementsData.data} />
                  <AchieveHistoryTable aHistories={achievementsData.data} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  活動履歴はまだありません。
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </main>
  );
}

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
