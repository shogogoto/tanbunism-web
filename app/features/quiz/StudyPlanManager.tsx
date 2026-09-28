import { useEffect, useState } from "react";
import { Link } from "react-router";
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
import StudyPlanForm from "./StudyPlanForm";
import {
  type QuizType,
  type StudyPlan,
  type StudyResource,
  deleteStudyPlan,
  listStudyPlans,
  listStudyResources,
  prepareStudyPlanQuizzes,
} from "./api";

const quizTypeLabels: Record<QuizType, string> = {
  term2sent: "用語 → 単文",
  sent2term: "単文 → 用語",
  rel2pair: "関係 → 単文組",
  pair2rel: "単文組 → 関係",
};

export default function StudyPlanManager() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [editingPlan, setEditingPlan] = useState<StudyPlan>();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>();
  const [preparingId, setPreparingId] = useState<string>();
  const [preparedCounts, setPreparedCounts] = useState<Record<string, number>>(
    {},
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([listStudyPlans(), listStudyResources()])
      .then(([loadedPlans, loadedResources]) => {
        if (!active) return;
        setPlans(loadedPlans);
        setResources(loadedResources);
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

  async function removePlan(plan: StudyPlan) {
    setDeletingId(plan.uid);
    setError(undefined);
    try {
      await deleteStudyPlan(plan.uid);
      setPlans((current) => current.filter(({ uid }) => uid !== plan.uid));
      if (editingPlan?.uid === plan.uid) setEditingPlan(undefined);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "学習計画を削除できませんでした。",
      );
    } finally {
      setDeletingId(undefined);
    }
  }

  async function preparePlan(plan: StudyPlan) {
    setPreparingId(plan.uid);
    setError(undefined);
    try {
      const prepared = await prepareStudyPlanQuizzes(plan);
      setPreparedCounts((current) => ({
        ...current,
        [plan.uid]: prepared.length,
      }));
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          学習するResourceとクイズ形式をあらかじめ準備します。
        </p>
        <Button
          onClick={() => {
            setEditingPlan(undefined);
            setIsCreating(true);
          }}
        >
          新しい計画
        </Button>
      </header>

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
              setIsCreating(false);
            }}
            onUpdated={(plan) => {
              setPlans((current) =>
                current.map((item) => (item.uid === plan.uid ? plan : item)),
              );
              setPreparedCounts((current) => {
                const next = { ...current };
                delete next[plan.uid];
                return next;
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>クイズ形式</TableHead>
                <TableHead>問題数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.uid}>
                  <TableCell>
                    <div className="font-medium">{plan.name}</div>
                    {preparedCounts[plan.uid] !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        準備完了 · {preparedCounts[plan.uid]}問
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {plan.resource_ids.map((resourceId) => (
                        <Badge key={resourceId} variant="secondary">
                          {resourceName(resourceId)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-72 flex-wrap gap-1">
                      {plan.quiz_types.map((quizType) => (
                        <Badge key={quizType} variant="outline">
                          {quizTypeLabels[quizType]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.n_quiz}問・{plan.n_option}択
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(preparingId)}
                        onClick={() => void preparePlan(plan)}
                      >
                        {preparingId === plan.uid
                          ? "準備中…"
                          : preparedCounts[plan.uid] === undefined
                            ? "準備する"
                            : "再準備"}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/quiz?plan=${encodeURIComponent(plan.uid)}`}>
                          解く
                        </Link>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === plan.uid}
                          >
                            削除
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              「{plan.name}」を削除しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              クイズや回答履歴は削除されません。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void removePlan(plan)}
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
