import { ArrowDown, ArrowUp } from "lucide-react";
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import PreparationNotice from "./PreparationNotice";
import type { QuizPreparationState, QuizType, StudyPlan } from "./api";
import {
  type PlanSortColumn as SortColumn,
  type PlanSort as SortState,
  normalizeResourceId,
} from "./studyPlanView";

const quizTypeLabels: Record<QuizType, string> = {
  term2sent: "用語 → 単文",
  sent2term: "単文 → 用語",
  rel2pair: "関係 → 単文組",
  pair2rel: "単文組 → 関係",
};

const quizTypeColumns: Array<{
  type: QuizType;
  from: string;
  to: string;
}> = [
  { type: "sent2term", from: "単文", to: "用語" },
  { type: "term2sent", from: "用語", to: "単文" },
  { type: "pair2rel", from: "単文組", to: "関係" },
  { type: "rel2pair", from: "関係", to: "単文組" },
];

function SortableHeader({
  children,
  column,
  className,
  sort,
  onSort,
}: {
  children: ReactNode;
  column: SortColumn;
  className?: string;
  sort?: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const direction = sort?.column === column ? sort.direction : "none";
  const Icon = direction === "ascending" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={direction}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center justify-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        {direction !== "none" && (
          <Icon className="size-3 shrink-0" aria-hidden="true" />
        )}
      </button>
    </TableHead>
  );
}

type Props = {
  isMobile: boolean;
  isLoading: boolean;
  filteredPlans: StudyPlan[];
  currentPlan?: StudyPlan;
  setCurrentPlanId: Dispatch<SetStateAction<string | undefined>>;
  selectedPlanIds: Set<string>;
  setSelectedPlanIds: Dispatch<SetStateAction<Set<string>>>;
  rowRefs: RefObject<Map<string, HTMLElement>>;
  preparedCounts: Record<string, number>;
  preparationStates: Record<string, QuizPreparationState | undefined>;
  resourceName: (id: string) => string;
  adventureAchievements: Record<string, number>;
  sort?: SortState;
  toggleSort: (column: SortColumn) => void;
};

/** Responsive presentation only; data, selection ownership and mutations stay with the manager. */
export default function StudyPlanList({
  isMobile,
  isLoading,
  filteredPlans,
  currentPlan,
  setCurrentPlanId,
  selectedPlanIds,
  setSelectedPlanIds,
  rowRefs,
  preparedCounts,
  preparationStates,
  resourceName,
  adventureAchievements,
  sort,
  toggleSort,
}: Props) {
  return isMobile ? (
    <div className="space-y-2">
      {isLoading ? (
        <Loading />
      ) : (
        filteredPlans.map((plan) => (
          <article
            key={plan.uid}
            ref={(element) => {
              if (element) rowRefs.current.set(plan.uid, element);
              else rowRefs.current.delete(plan.uid);
            }}
            aria-current={currentPlan?.uid === plan.uid || undefined}
            className={`min-w-0 scroll-mt-20 space-y-3 rounded-md border p-3 ${
              currentPlan?.uid === plan.uid
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : ""
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                aria-label={`${plan.name}を選択`}
                checked={selectedPlanIds.has(plan.uid)}
                onChange={(event) =>
                  setSelectedPlanIds((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(plan.uid);
                    else next.delete(plan.uid);
                    return next;
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate font-medium" title={plan.name}>
                    {plan.name}
                  </div>
                  {plan.default_resource_plan && (
                    <Badge variant="secondary" className="shrink-0">
                      ゲーム連携・削除不可
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <strong className="text-sm tabular-nums text-foreground">
                    {preparedCounts[plan.uid] ?? 0}
                  </strong>
                  問準備済み・1回{plan.n_quiz}問・{plan.n_option}択
                  <PreparationNotice
                    preparation={preparationStates[plan.uid]}
                  />
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap gap-1">
              {plan.resource_ids.map((resourceId) => {
                const name = resourceName(resourceId);
                return (
                  <Badge
                    key={resourceId}
                    variant="secondary"
                    className="max-w-56"
                    title={name}
                  >
                    <span className="truncate">{name}</span>
                  </Badge>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {plan.quiz_types.map((quizType) => (
                <Badge key={quizType} variant="outline">
                  {quizTypeLabels[quizType]}
                </Badge>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  ) : (
    <div className="rounded-md border">
      <Table className="table-fixed" containerClassName="overflow-visible">
        <TableHeader className="sticky top-20 z-20 bg-background shadow-sm">
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                aria-label="すべてのStudyPlanを選択"
                checked={
                  filteredPlans.length > 0 &&
                  filteredPlans.every(({ uid }) => selectedPlanIds.has(uid))
                }
                onChange={(event) =>
                  setSelectedPlanIds(
                    event.target.checked
                      ? new Set(filteredPlans.map(({ uid }) => uid))
                      : new Set(),
                  )
                }
              />
            </TableHead>
            <SortableHeader
              column="name"
              className="w-36"
              sort={sort}
              onSort={toggleSort}
            >
              Plan
            </SortableHeader>
            <SortableHeader
              column="resource"
              className="w-44"
              sort={sort}
              onSort={toggleSort}
            >
              Resource
            </SortableHeader>
            <SortableHeader
              column="achievement"
              className="w-16 text-center"
              sort={sort}
              onSort={toggleSort}
            >
              達成度
            </SortableHeader>
            <SortableHeader
              column="prepared"
              className="w-16 text-center"
              sort={sort}
              onSort={toggleSort}
            >
              準備済み
            </SortableHeader>
            <SortableHeader
              column="options"
              className="w-14 text-center"
              sort={sort}
              onSort={toggleSort}
            >
              選択肢
            </SortableHeader>
            {quizTypeColumns.map(({ type, from, to }) => (
              <SortableHeader
                key={type}
                column={type}
                className="w-20 whitespace-normal text-center text-[11px] leading-tight"
                sort={sort}
                onSort={toggleSort}
              >
                <span className="block">{from}</span>
                <span className="block">→{to}</span>
              </SortableHeader>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6 + quizTypeColumns.length}>
                <Loading />
              </TableCell>
            </TableRow>
          ) : (
            filteredPlans.map((plan) => (
              <TableRow
                key={plan.uid}
                ref={(element) => {
                  if (element) rowRefs.current.set(plan.uid, element);
                  else rowRefs.current.delete(plan.uid);
                }}
                data-state={
                  selectedPlanIds.has(plan.uid) ? "selected" : undefined
                }
                aria-current={currentPlan?.uid === plan.uid || undefined}
                className={
                  currentPlan?.uid === plan.uid
                    ? "scroll-mt-20 bg-primary/5 ring-1 ring-inset ring-primary"
                    : "scroll-mt-20"
                }
                onClick={() => setCurrentPlanId(plan.uid)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`${plan.name}を選択`}
                    checked={selectedPlanIds.has(plan.uid)}
                    onChange={(event) =>
                      setSelectedPlanIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(plan.uid);
                        else next.delete(plan.uid);
                        return next;
                      })
                    }
                  />
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  <div className="flex items-center gap-2">
                    <div
                      className="max-w-44 truncate font-medium"
                      title={plan.name}
                    >
                      {plan.name}
                    </div>
                    {plan.default_resource_plan && (
                      <Badge variant="secondary" className="shrink-0">
                        ゲーム連携・削除不可
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="min-w-0 whitespace-normal">
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {plan.resource_ids.map((resourceId) => {
                      const name = resourceName(resourceId);
                      return (
                        <Badge
                          key={resourceId}
                          variant="secondary"
                          className="max-w-48"
                          title={name}
                        >
                          <span className="truncate">{name}</span>
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {plan.resource_ids.length === 1
                    ? (adventureAchievements[
                        normalizeResourceId(plan.resource_ids[0])
                      ] ?? 0)
                    : "—"}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {preparedCounts[plan.uid] ?? 0}
                  <PreparationNotice
                    preparation={preparationStates[plan.uid]}
                  />
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {plan.n_option}
                </TableCell>
                {quizTypeColumns.map(({ type, from, to }) => {
                  const enabled = plan.quiz_types.includes(type);
                  return (
                    <TableCell key={type} className="text-center">
                      <span
                        className={`inline-flex min-w-9 justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          enabled
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                        aria-label={`${from}から${to}: ${enabled ? "ON" : "OFF"}`}
                      >
                        {enabled ? "ON" : "OFF"}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
