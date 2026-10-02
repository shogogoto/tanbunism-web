import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useNotifications } from "~/features/notifications/NotificationProvider";
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
  type StudyResource,
  deleteStudyPlan,
  listStudyPlanPreparations,
  listStudyPlans,
  listStudyResources,
  prepareAdditionalStudyPlanQuizzes,
  updateStudyPlan,
} from "./api";

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

export default function StudyPlanManager() {
  const isMobile = useIsMobile(1024);
  const { refreshNotifications } = useNotifications();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [editingPlan, setEditingPlan] = useState<StudyPlan>();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkAction, setBulkAction] = useState<"delete" | "types">();
  const [preparingId, setPreparingId] = useState<string>();
  const [preparedCounts, setPreparedCounts] = useState<Record<string, number>>(
    {},
  );
  const [additionalCounts, setAdditionalCounts] = useState<
    Record<string, number>
  >({});
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([
      listStudyPlans(),
      listStudyResources(),
      listStudyPlanPreparations(),
    ])
      .then(([loadedPlans, loadedResources, preparations]) => {
        if (!active) return;
        setPlans(loadedPlans);
        setResources(loadedResources);
        setPreparedCounts(
          Object.fromEntries(
            preparations.map((status) => [
              status.plan_id,
              status.prepared_quiz_count,
            ]),
          ),
        );
        setAdditionalCounts(
          Object.fromEntries(
            loadedPlans.map((plan) => [plan.uid, Math.max(1, plan.n_quiz)]),
          ),
        );
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "学習計画を取得できませんでした。",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resourceNames = new Map(
    resources.map((resource) => [
      resource.uid.replaceAll("-", ""),
      resource.name,
    ]),
  );

  function resourceName(resourceId: string) {
    return (
      resourceNames.get(resourceId.replaceAll("-", "")) ?? "不明なResource"
    );
  }

  const selectedPlans = plans.filter(({ uid }) => selectedPlanIds.has(uid));
  const selectedPlan =
    selectedPlans.length === 1 ? selectedPlans[0] : undefined;

  async function removeSelectedPlans() {
    const selected = new Set(selectedPlanIds);
    setBulkAction("delete");
    setError(undefined);
    try {
      await Promise.all([...selected].map((planId) => deleteStudyPlan(planId)));
      setPlans((current) => current.filter(({ uid }) => !selected.has(uid)));
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
      setPlans((current) =>
        current.map((plan) => updatedById.get(plan.uid) ?? plan),
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
      setPreparedCounts((current) => ({
        ...current,
        [plan.uid]: prepared.prepared_quiz_count,
      }));
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
      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
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
              setPlans((current) => [...current, plan]);
              setPreparedCounts((current) => ({ ...current, [plan.uid]: 0 }));
              setAdditionalCounts((current) => ({
                ...current,
                [plan.uid]: Math.max(1, plan.n_quiz),
              }));
              setIsCreating(false);
            }}
            onUpdated={(plan) => {
              setPlans((current) =>
                current.map((item) => (item.uid === plan.uid ? plan : item)),
              );
              setAdditionalCounts((current) => ({
                ...current,
                [plan.uid]: Math.max(1, plan.n_quiz),
              }));
              void listStudyPlanPreparations().then((preparations) => {
                setPreparedCounts(
                  Object.fromEntries(
                    preparations.map((status) => [
                      status.plan_id,
                      status.prepared_quiz_count,
                    ]),
                  ),
                );
              });
              setEditingPlan(undefined);
            }}
            onCancel={() => {
              setIsCreating(false);
              setEditingPlan(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      {isLoading && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}

      {!isLoading && plans.length === 0 && !isCreating ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          学習計画がありません。Resourceとクイズ形式を選び、最初の計画を作成してください。
        </p>
      ) : (
        <div className="space-y-3" data-dashboard-swipe-ignore>
          <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            {isMobile && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label="すべてのStudyPlanを選択"
                  checked={
                    plans.length > 0 && selectedPlanIds.size === plans.length
                  }
                  onChange={(event) =>
                    setSelectedPlanIds(
                      event.target.checked
                        ? new Set(plans.map(({ uid }) => uid))
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
            {selectedPlanIds.size > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {selectedPlan && planActions(selectedPlan)}
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
              </div>
            )}
          </div>
          {isMobile ? (
            <div className="space-y-2">
              {plans.map((plan) => (
                <article
                  key={plan.uid}
                  className="min-w-0 space-y-3 rounded-md border p-3"
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
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="すべてのStudyPlanを選択"
                        checked={
                          plans.length > 0 &&
                          selectedPlanIds.size === plans.length
                        }
                        onChange={(event) =>
                          setSelectedPlanIds(
                            event.target.checked
                              ? new Set(plans.map(({ uid }) => uid))
                              : new Set(),
                          )
                        }
                      />
                    </TableHead>
                    <TableHead className="w-[20%]">Plan</TableHead>
                    <TableHead className="w-[28%]">Resource</TableHead>
                    <TableHead className="w-[30%]">クイズ形式</TableHead>
                    <TableHead className="w-[22%]">準備状況・設定</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow
                      key={plan.uid}
                      data-state={
                        selectedPlanIds.has(plan.uid) ? "selected" : undefined
                      }
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
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap gap-1">
                          {plan.quiz_types.map((quizType) => (
                            <Badge key={quizType} variant="outline">
                              {quizTypeLabels[quizType]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <strong className="text-base tabular-nums">
                          {preparedCounts[plan.uid] ?? 0}
                        </strong>
                        <span className="ml-1 text-xs text-muted-foreground">
                          問準備済み
                        </span>
                        <div className="mt-1 text-xs text-muted-foreground">
                          1回{plan.n_quiz}問・{plan.n_option}択
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
      {!isLoading && (
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
      )}
    </div>
  );
}
