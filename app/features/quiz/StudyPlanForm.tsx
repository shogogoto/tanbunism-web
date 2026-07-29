import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/shared/components/ui/alert";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  type StudyPlan,
  type StudyPlanDraft,
  type StudyResource,
  createStudyPlan,
  listStudyResources,
  updateStudyPlan,
} from "./api";

const quizTypes = [
  ["term2sent", "用語から単文"],
  ["sent2term", "単文から用語"],
  ["rel2pair", "関係から単文の組"],
  ["pair2rel", "単文の組から関係"],
] as const;

export default function StudyPlanForm({
  onCreated,
  plan,
  onUpdated,
  onCancel,
}: {
  onCreated: (plan: StudyPlan) => void;
  plan?: StudyPlan;
  onUpdated?: (plan: StudyPlan) => void;
  onCancel?: () => void;
}) {
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    plan?.resource_ids ?? [],
  );
  const [name, setName] = useState(plan?.name ?? "");
  const [selectedQuizTypes, setSelectedQuizTypes] = useState<
    StudyPlanDraft["quiz_types"]
  >(plan?.quiz_types ?? ["term2sent"]);
  const [nQuiz, setNQuiz] = useState<number | "">(
    Math.max(plan?.n_quiz ?? 5, plan?.quiz_types.length ?? 1),
  );
  const [nOption, setNOption] = useState(plan?.n_option ?? 4);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    listStudyResources()
      .then((loadedResources) => {
        if (active) setResources(loadedResources);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "リソースを取得できませんでした。",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleResource(resourceId: string) {
    setSelectedResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((id) => id !== resourceId)
        : [...current, resourceId],
    );
  }

  function toggleQuizType(quizType: StudyPlanDraft["quiz_types"][number]) {
    const nextQuizTypes = selectedQuizTypes.includes(quizType)
      ? selectedQuizTypes.filter((type) => type !== quizType)
      : [...selectedQuizTypes, quizType];
    setSelectedQuizTypes(nextQuizTypes);
    setNQuiz((current) =>
      Math.max(current === "" ? 0 : current, nextQuizTypes.length),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      const draft = {
        name,
        resource_ids: selectedResourceIds,
        quiz_types: selectedQuizTypes,
        n_quiz: Math.max(nQuiz === "" ? 0 : nQuiz, selectedQuizTypes.length, 1),
        n_option: nOption,
      };
      if (plan) {
        onUpdated?.(await updateStudyPlan(plan.uid, draft));
      } else {
        onCreated(await createStudyPlan(draft));
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "学習計画を作成できませんでした。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-2">
        <Label htmlFor="plan-name">Plan名</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例: 代数学の復習"
          required
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">学習するリソース</legend>
        {isLoading && <p className="text-sm">リソースを読み込んでいます…</p>}
        {!isLoading && resources.length === 0 && (
          <p className="text-sm text-muted-foreground">
            学習対象にできるリソースがありません。
          </p>
        )}
        {resources.map((resource) => (
          <label
            key={resource.uid}
            className="flex items-center gap-3 border p-3 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedResourceIds.includes(resource.uid)}
              onChange={() => toggleResource(resource.uid)}
            />
            {resource.name}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">クイズ形式</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {quizTypes.map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-3 border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedQuizTypes.includes(value)}
                onChange={() => toggleQuizType(value)}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          出題数は全形式の合計です。選択した各形式を最低1問ずつ出題します。
        </p>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="quiz-count">出題数（合計）</Label>
          <Input
            id="quiz-count"
            type="number"
            min={Math.max(1, selectedQuizTypes.length)}
            value={nQuiz}
            onChange={(event) => {
              setNQuiz(
                event.target.value === ""
                  ? ""
                  : Math.max(
                      event.target.valueAsNumber,
                      selectedQuizTypes.length,
                      1,
                    ),
              );
            }}
            onBlur={() => {
              if (nQuiz === "") {
                setNQuiz(Math.max(selectedQuizTypes.length, 1));
              }
            }}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="option-count">選択肢数</Label>
          <Input
            id="option-count"
            type="number"
            min={1}
            value={nOption}
            onChange={(event) => setNOption(event.target.valueAsNumber)}
            required
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            isLoading ||
            resources.length === 0 ||
            selectedResourceIds.length === 0 ||
            selectedQuizTypes.length === 0
          }
        >
          {isSubmitting
            ? plan
              ? "更新中…"
              : "作成中…"
            : plan
              ? "変更を保存"
              : "作成してクイズを始める"}
        </Button>
      </div>
    </form>
  );
}
