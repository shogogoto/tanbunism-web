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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import StudyPlanForm from "./StudyPlanForm";
import {
  type QuizType,
  type StudyPlan,
  type StudyResource,
  deleteStudyPlan,
  listStudyPlans,
  listStudyResources,
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">学習計画</h1>
          <p className="text-sm text-muted-foreground">
            学習するResourceとクイズ形式を組み合わせて管理します。
          </p>
        </div>
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

      {(isCreating || editingPlan) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingPlan ? "学習計画を編集" : "学習計画を作成"}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                setEditingPlan(undefined);
              }}
              onCancel={() => {
                setIsCreating(false);
                setEditingPlan(undefined);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}

      {!isLoading && plans.length === 0 && !isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>学習計画がありません</CardTitle>
            <CardDescription>
              Resourceとクイズ形式を選び、最初の計画を作成してください。
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.uid}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                {plan.n_quiz}問・各{plan.n_option}択
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-muted-foreground">
                  Resource
                </h2>
                <div className="flex flex-wrap gap-2">
                  {plan.resource_ids.map((resourceId) => (
                    <Badge key={resourceId} variant="secondary">
                      {resourceName(resourceId)}
                    </Badge>
                  ))}
                </div>
              </section>
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-muted-foreground">
                  クイズ形式
                </h2>
                <div className="flex flex-wrap gap-2">
                  {plan.quiz_types.map((quizType) => (
                    <Badge key={quizType} variant="outline">
                      {quizTypeLabels[quizType]}
                    </Badge>
                  ))}
                </div>
              </section>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild>
                  <Link to={`/quiz?plan=${encodeURIComponent(plan.uid)}`}>
                    この計画でクイズを解く
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlan(plan);
                  }}
                >
                  編集
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" disabled={deletingId === plan.uid}>
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
                      <AlertDialogAction onClick={() => void removePlan(plan)}>
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
