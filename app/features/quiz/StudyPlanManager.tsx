import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useNotifications } from "~/features/notifications/NotificationProvider";
import Loading from "~/shared/components/Loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/shared/components/ui/alert-dialog";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import type { StudyPlanDraft } from "~/shared/generated/fastAPI.schemas";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import StudyPlanForm from "./StudyPlanForm";
import {
  type QuizType,
  type StudyPlan,
  type StudyPlanPreparationStatus,
  type StudyResource,
  deleteStudyPlan,
  listStudyPlanPreparations,
  listStudyPlans,
  listStudyResources,
  prepareAdditionalStudyPlanQuizzes,
  prepareSelectedStudyPlans,
  updateStudyPlan,
} from "./api";
import { useQuizSWR } from "./useQuizSWR";

const allQuizTypes: StudyPlanDraft["quiz_types"] = [
  "term2sent",
  "sent2term",
  "rel2pair",
  "pair2rel",
];

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

const emptyPlans: StudyPlan[] = [];
const emptyResources: StudyResource[] = [];
const emptyPreparations: StudyPlanPreparationStatus[] = [];

export default function StudyPlanManager() {
  const isMobile = useIsMobile(1024);
  const navigate = useNavigate();
  const { refreshNotifications } = useNotifications();
  const {
    data: plans = emptyPlans,
    error: plansError,
    isLoading,
    mutate: mutatePlans,
  } = useQuizSWR<StudyPlan[]>("study-plan-manager-plans", listStudyPlans, {
    keepPreviousData: true,
  });
  const { data: resources = emptyResources, error: resourcesError } =
    useQuizSWR<StudyResource[]>(
      "study-plan-manager-resources",
      listStudyResources,
      { keepPreviousData: true },
    );
  const {
    data: preparations = emptyPreparations,
    error: preparationsError,
    mutate: mutatePreparations,
  } = useQuizSWR("study-plan-manager-preparations", listStudyPlanPreparations, {
    keepPreviousData: true,
  });
  const [editingPlan, setEditingPlan] = useState<StudyPlan>();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkAction, setBulkAction] = useState<
    "delete" | "types" | "prepare"
  >();
  const [query, setQuery] = useState("");
  const [currentPlanId, setCurrentPlanId] = useState<string>();
  const [preparingId, setPreparingId] = useState<string>();
  const [additionalCounts, setAdditionalCounts] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string>();
  const rowRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    setAdditionalCounts((current) =>
      Object.fromEntries(
        plans.map((plan) => [
          plan.uid,
          current[plan.uid] ?? Math.max(1, plan.n_quiz),
        ]),
      ),
    );
  }, [plans]);

  const preparedCounts = useMemo(
    () =>
      Object.fromEntries(
        preparations.map((status) => [
          status.plan_id,
          status.prepared_quiz_count,
        ]),
      ),
    [preparations],
  );
  const loadError = plansError ?? resourcesError ?? preparationsError;

  const resourceNames = useMemo(
    () =>
      new Map(
        resources.map((resource) => [
          resource.uid.replaceAll("-", ""),
          resource.name,
        ]),
      ),
    [resources],
  );

  function resourceName(resourceId: string) {
    return (
      resourceNames.get(resourceId.replaceAll("-", "")) ?? "不明なResource"
    );
  }

  const selectedPlans = plans.filter(({ uid }) => selectedPlanIds.has(uid));
  const selectedPlan =
    selectedPlans.length === 1 ? selectedPlans[0] : undefined;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredPlans = useMemo(
    () =>
      plans.filter((plan) => {
        if (!normalizedQuery) return true;
        const resourceText = plan.resource_ids
          .map(
            (resourceId) =>
              resourceNames.get(resourceId.replaceAll("-", "")) ??
              "不明なResource",
          )
          .join(" ");
        return `${plan.name} ${resourceText}`
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      }),
    [plans, normalizedQuery, resourceNames],
  );
  const currentPlan =
    filteredPlans.find(({ uid }) => uid === currentPlanId) ?? filteredPlans[0];
  const actionPlan =
    selectedPlan ?? (selectedPlanIds.size === 0 ? currentPlan : undefined);

  useEffect(() => {
    setCurrentPlanId((current) =>
      filteredPlans.some(({ uid }) => uid === current)
        ? current
        : filteredPlans[0]?.uid,
    );
  }, [filteredPlans]);

  useEffect(() => {
    function handlePlanHotkey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isCreating ||
        editingPlan
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable)
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        event.preventDefault();
        setCurrentPlanId((current) => {
          const index = filteredPlans.findIndex(({ uid }) => uid === current);
          const nextIndex =
            key === "j"
              ? Math.min(filteredPlans.length - 1, Math.max(0, index + 1))
              : Math.max(0, index < 0 ? filteredPlans.length - 1 : index - 1);
          return filteredPlans[nextIndex]?.uid;
        });
        return;
      }
      if (!currentPlan) return;
      if (key === " ") {
        event.preventDefault();
        setSelectedPlanIds((current) => {
          const next = new Set(current);
          if (next.has(currentPlan.uid)) next.delete(currentPlan.uid);
          else next.add(currentPlan.uid);
          return next;
        });
        return;
      }
      if (key === "a" && !event.repeat && !preparingId) {
        event.preventDefault();
        void preparePlan(currentPlan);
        return;
      }
      if (key === "e") {
        event.preventDefault();
        setIsCreating(false);
        setEditingPlan(currentPlan);
        return;
      }
      if (key === "enter") {
        event.preventDefault();
        navigate(`/quiz?plan=${encodeURIComponent(currentPlan.uid)}`);
      }
    }
    document.addEventListener("keydown", handlePlanHotkey);
    return () => document.removeEventListener("keydown", handlePlanHotkey);
  }, [
    currentPlan,
    editingPlan,
    filteredPlans,
    isCreating,
    navigate,
    preparingId,
  ]);

  useEffect(() => {
    if (!currentPlanId) return;
    rowRefs.current
      .get(currentPlanId)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentPlanId]);

  async function removeSelectedPlans() {
    const selected = new Set(selectedPlanIds);
    setBulkAction("delete");
    setError(undefined);
    try {
      await Promise.all([...selected].map((planId) => deleteStudyPlan(planId)));
      await mutatePlans(
        (current) => (current ?? []).filter(({ uid }) => !selected.has(uid)),
        { revalidate: false },
      );
      setSelectedPlanIds(new Set());
      if (editingPlan && selected.has(editingPlan.uid))
        setEditingPlan(undefined);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "学習計画を削除できませんでした。",
      );
    } finally {
      setBulkAction(undefined);
    }
  }

  async function applyAllQuizTypes() {
    const selected = plans.filter(({ uid }) => selectedPlanIds.has(uid));
    setBulkAction("types");
    setError(undefined);
    try {
      const updated = await Promise.all(
        selected.map((plan) =>
          updateStudyPlan(plan.uid, {
            name: plan.name,
            resource_ids: plan.resource_ids,
            quiz_types: allQuizTypes,
            n_quiz: Math.max(plan.n_quiz, allQuizTypes.length),
            n_option: plan.n_option,
          }),
        ),
      );
      const updatedById = new Map(updated.map((plan) => [plan.uid, plan]));
      await mutatePlans(
        (current) =>
          (current ?? []).map((plan) => updatedById.get(plan.uid) ?? plan),
        { revalidate: false },
      );
      setSelectedPlanIds(new Set());
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "クイズ形式を一括変更できませんでした。",
      );
    } finally {
      setBulkAction(undefined);
    }
  }

  async function prepareSelectedPlans() {
    const planIds = [...selectedPlanIds];
    setBulkAction("prepare");
    setError(undefined);
    try {
      const accepted = await prepareSelectedStudyPlans(planIds);
      toast.success(
        `${accepted.accepted_count}件の学習計画をバックグラウンドで準備します`,
        {
          description: "完了したら通知でお知らせします。",
        },
      );
      setSelectedPlanIds(new Set());
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "選択した学習計画を準備できませんでした。",
      );
    } finally {
      setBulkAction(undefined);
    }
  }

  async function preparePlan(plan: StudyPlan) {
    setPreparingId(plan.uid);
    setError(undefined);
    try {
      const requested = Math.min(
        20,
        Math.max(1, additionalCounts[plan.uid] ?? plan.n_quiz),
      );
      const prepared = await prepareAdditionalStudyPlanQuizzes(
        plan.uid,
        requested,
      );
      await mutatePreparations(
        (current) => [
          ...(current ?? []).filter((status) => status.plan_id !== plan.uid),
          {
            plan_id: plan.uid,
            prepared_quiz_count: prepared.prepared_quiz_count,
          },
        ],
        { revalidate: false },
      );
      if (prepared.added_count > 0) {
        const description = `「${plan.name}」に${prepared.added_count}問追加しました。準備済みは合計${prepared.prepared_quiz_count}問です。`;
        toast.success("クイズの準備が完了しました", { description });
        await refreshNotifications();
      } else {
        toast.info("追加できる新しい問題がありませんでした", {
          description: `「${plan.name}」の対象範囲は準備済みです。`,
        });
      }
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "クイズを準備できませんでした。",
      );
    } finally {
      setPreparingId(undefined);
    }
  }

  function planActions(plan: StudyPlan) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>追加</span>
          <input
            type="number"
            min={1}
            max={20}
            className="h-8 w-16 rounded-md border bg-background px-2 text-right text-sm text-foreground"
            aria-label={`${plan.name}に追加する問題数`}
            value={additionalCounts[plan.uid] ?? Math.max(1, plan.n_quiz)}
            onChange={(event) => {
              const count = Number(event.target.value);
              setAdditionalCounts((current) => ({
                ...current,
                [plan.uid]: count,
              }));
            }}
            onBlur={() => {
              setAdditionalCounts((current) => ({
                ...current,
                [plan.uid]: Math.min(20, Math.max(1, current[plan.uid] || 1)),
              }));
            }}
          />
          <span>問</span>
        </label>
        <Button
          type="button"
          size="sm"
          disabled={Boolean(preparingId)}
          onClick={() => void preparePlan(plan)}
        >
          {preparingId === plan.uid ? "準備中…" : "追加"}
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/quiz?plan=${encodeURIComponent(plan.uid)}`}>解く</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsCreating(false);
            setEditingPlan(plan);
          }}
        >
          編集
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      {(error || loadError) && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error ??
            (loadError instanceof Error
              ? loadError.message
              : "学習計画を取得できませんでした。")}
        </p>
      )}

      <Dialog
        open={isCreating || Boolean(editingPlan)}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingPlan(undefined);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "学習計画を編集" : "学習計画を作成"}
            </DialogTitle>
            <DialogDescription>
              クイズを解く前に、対象Resourceと形式を準備します。
            </DialogDescription>
          </DialogHeader>
          <StudyPlanForm
            plan={editingPlan}
            createLabel="学習計画を作成"
            onCreated={(plan) => {
              void mutatePlans((current) => [...(current ?? []), plan], {
                revalidate: false,
              });
              void mutatePreparations(
                (current) => [
                  ...(current ?? []),
                  { plan_id: plan.uid, prepared_quiz_count: 0 },
                ],
                { revalidate: false },
              );
              setAdditionalCounts((current) => ({
                ...current,
                [plan.uid]: Math.max(1, plan.n_quiz),
              }));
              setIsCreating(false);
            }}
            onUpdated={(plan) => {
              void mutatePlans(
                (current) =>
                  (current ?? []).map((item) =>
                    item.uid === plan.uid ? plan : item,
                  ),
                { revalidate: false },
              );
              setAdditionalCounts((current) => ({
                ...current,
                [plan.uid]: Math.max(1, plan.n_quiz),
              }));
              void mutatePreparations();
              setEditingPlan(undefined);
            }}
            onCancel={() => {
              setIsCreating(false);
              setEditingPlan(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      {!isLoading && plans.length === 0 && !isCreating ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              size="icon"
              className="size-11 rounded-full shadow-md"
              aria-label="学習計画を作成"
              title="学習計画を作成"
              onClick={() => {
                setEditingPlan(undefined);
                setIsCreating(true);
              }}
            >
              <Plus className="size-5" />
            </Button>
          </div>
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            学習計画がありません。Resourceとクイズ形式を選び、最初の計画を作成してください。
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-dashboard-swipe-ignore>
          <div className="sticky top-0 z-30 flex min-h-11 flex-wrap items-center gap-2 rounded-md border bg-background/95 px-3 py-2 shadow-sm backdrop-blur lg:h-20">
            <input
              type="search"
              className="h-8 w-full rounded-md border bg-background px-3 text-sm sm:w-56"
              aria-label="StudyPlanを検索"
              placeholder="Plan / Resourceを検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {isMobile && (
              <label className="flex items-center gap-2 text-sm">
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
                すべて選択
              </label>
            )}
            <span className="text-xs text-muted-foreground">
              {selectedPlanIds.size}件選択中
            </span>
            {currentPlan && (
              <span
                className="max-w-40 truncate text-xs text-muted-foreground"
                title={currentPlan.name}
              >
                current: {currentPlan.name}
              </span>
            )}
            {(actionPlan || selectedPlanIds.size > 0) && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {actionPlan && planActions(actionPlan)}
                {selectedPlanIds.size > 0 && (
                  <>
                    {selectedPlanIds.size > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(bulkAction)}
                        onClick={() => void prepareSelectedPlans()}
                      >
                        {bulkAction === "prepare"
                          ? "受付中…"
                          : `選択した${selectedPlanIds.size}件を準備`}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(bulkAction)}
                      onClick={() => void applyAllQuizTypes()}
                    >
                      {bulkAction === "types" ? "変更中…" : "4形式に変更"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={Boolean(bulkAction)}
                        >
                          {selectedPlanIds.size}件を削除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            選択した{selectedPlanIds.size}件を削除しますか？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            クイズや回答履歴は削除されません。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void removeSelectedPlans()}
                          >
                            {bulkAction === "delete" ? "削除中…" : "削除する"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}
            <Button
              type="button"
              size="icon"
              className={`size-9 shrink-0 rounded-full shadow-sm ${
                actionPlan || selectedPlanIds.size > 0 ? "" : "ml-auto"
              }`}
              aria-label="学習計画を作成"
              title="学習計画を作成"
              onClick={() => {
                setEditingPlan(undefined);
                setIsCreating(true);
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {!isLoading && filteredPlans.length === 0 && (
            <p className="rounded-md border p-4 text-sm text-muted-foreground">
              検索条件に一致する学習計画がありません。
            </p>
          )}
          {isMobile ? (
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
                        <div className="truncate font-medium" title={plan.name}>
                          {plan.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          <strong className="text-sm tabular-nums text-foreground">
                            {preparedCounts[plan.uid] ?? 0}
                          </strong>
                          問準備済み・1回{plan.n_quiz}問・{plan.n_option}択
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
              <Table
                className="table-fixed"
                containerClassName="overflow-visible"
              >
                <TableHeader className="sticky top-20 z-20 bg-background shadow-sm">
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="すべてのStudyPlanを選択"
                        checked={
                          filteredPlans.length > 0 &&
                          filteredPlans.every(({ uid }) =>
                            selectedPlanIds.has(uid),
                          )
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
                    <TableHead className="w-36">Plan</TableHead>
                    <TableHead className="w-44">Resource</TableHead>
                    <TableHead className="w-16 text-center">準備済み</TableHead>
                    <TableHead className="w-14 text-center">1回</TableHead>
                    <TableHead className="w-14 text-center">選択肢</TableHead>
                    {quizTypeColumns.map(({ type, from, to }) => (
                      <TableHead
                        key={type}
                        className="w-20 whitespace-normal text-center text-[11px] leading-tight"
                      >
                        <span className="block">{from}</span>
                        <span className="block">→{to}</span>
                      </TableHead>
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
                        aria-current={
                          currentPlan?.uid === plan.uid || undefined
                        }
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
                          <div
                            className="max-w-44 truncate font-medium"
                            title={plan.name}
                          >
                            {plan.name}
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
                          {preparedCounts[plan.uid] ?? 0}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {plan.n_quiz}
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
          )}
        </div>
      )}
    </div>
  );
}
