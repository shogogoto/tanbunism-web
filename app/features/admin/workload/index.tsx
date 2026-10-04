import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  type QuizPreparationSettings,
  type ResourceImportSettings,
  getQuizPreparationSettings,
  getResourceImportSettings,
  updateQuizPreparationSettings,
  updateResourceImportSettings,
} from "./api";

export default function WorkloadSettingsManager() {
  const [quiz, setQuiz] = useState<QuizPreparationSettings>();
  const [resourceImport, setResourceImport] =
    useState<ResourceImportSettings>();
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([getQuizPreparationSettings(), getResourceImportSettings()])
      .then(([quizSettings, importSettings]) => {
        setQuiz(quizSettings);
        setResourceImport(importSettings);
      })
      .catch((loadError: unknown) => setError(errorMessage(loadError)));
  }, []);

  async function save() {
    if (!quiz || !resourceImport) return;
    setIsSaving(true);
    setError(undefined);
    try {
      const [savedQuiz, savedImport] = await Promise.all([
        updateQuizPreparationSettings(quiz),
        updateResourceImportSettings(resourceImport),
      ]);
      setQuiz(savedQuiz);
      setResourceImport(savedImport);
      toast.success("負荷制御の設定を更新しました");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if ((!quiz || !resourceImport) && !error) {
    return <p className="p-6 text-sm text-muted-foreground">設定を取得中…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      <section className="space-y-1">
        <h2 className="text-lg font-semibold">負荷制御</h2>
        <p className="text-sm text-muted-foreground">
          バックグラウンドのクイズ作成と同期importを、それぞれ独立して制限します。
        </p>
      </section>

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {quiz && resourceImport && (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <section className="space-y-4 rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">一括クイズ作成</h3>
              <p className="text-xs text-muted-foreground">
                枠が埋まっているジョブはバックグラウンドで順番を待ちます。
              </p>
            </div>
            <SettingInput
              id="max-concurrent-jobs"
              label="サーバー全体の同時ジョブ数"
              description="通常は1のままにするとNeo4jへの負荷を抑えられます。"
              value={quiz.max_concurrent_jobs}
              min={1}
              max={8}
              onChange={(value) =>
                setQuiz({ ...quiz, max_concurrent_jobs: value })
              }
            />
            <SettingInput
              id="max-user-jobs"
              label="1ユーザーの待機・実行ジョブ数"
              description="連打や同じPlanへの重複投入を防ぐには1を指定します。"
              value={quiz.max_concurrent_jobs_per_user}
              min={1}
              max={4}
              onChange={(value) =>
                setQuiz({ ...quiz, max_concurrent_jobs_per_user: value })
              }
            />
            <SettingInput
              id="max-quizzes-per-job"
              label="1ジョブの総生成数上限"
              description="選択したPlan数 × 各Planの追加数で判定します。"
              value={quiz.max_quizzes_per_job}
              min={1}
              max={2000}
              onChange={(value) =>
                setQuiz({ ...quiz, max_quizzes_per_job: value })
              }
            />
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">読書メモimport</h3>
              <p className="text-xs text-muted-foreground">
                枠が埋まっている場合は待機させず、再送可能なエラーを返します。
              </p>
            </div>
            <SettingInput
              id="max-concurrent-imports"
              label="サーバー全体の同時import数"
              description="parseとNeo4j更新を同時に走らせる上限です。"
              value={resourceImport.max_concurrent_imports}
              min={1}
              max={8}
              onChange={(value) =>
                setResourceImport({
                  ...resourceImport,
                  max_concurrent_imports: value,
                })
              }
            />
            <SettingInput
              id="max-user-imports"
              label="1ユーザーの同時import数"
              description="通常は画面側も逐次処理するため1で十分です。"
              value={resourceImport.max_concurrent_imports_per_user}
              min={1}
              max={4}
              onChange={(value) =>
                setResourceImport({
                  ...resourceImport,
                  max_concurrent_imports_per_user: value,
                })
              }
            />
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中…" : "保存"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function SettingInput({
  id,
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[1fr_8rem] sm:items-center">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "設定を更新できませんでした。";
}
