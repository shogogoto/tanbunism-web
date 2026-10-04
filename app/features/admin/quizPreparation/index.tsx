import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  type QuizPreparationSettings,
  getQuizPreparationSettings,
  updateQuizPreparationSettings,
} from "./api";

export default function QuizPreparationSettingsManager() {
  const [settings, setSettings] = useState<QuizPreparationSettings>();
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getQuizPreparationSettings()
      .then(setSettings)
      .catch((loadError: unknown) => setError(errorMessage(loadError)));
  }, []);

  async function save() {
    if (!settings) return;
    setIsSaving(true);
    setError(undefined);
    try {
      setSettings(await updateQuizPreparationSettings(settings));
      toast.success("クイズ作成の制限を更新しました");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings && !error) {
    return <p className="p-6 text-sm text-muted-foreground">設定を取得中…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      <section className="space-y-1">
        <h2 className="text-lg font-semibold">一括クイズ作成</h2>
        <p className="text-sm text-muted-foreground">
          複数ユーザーによる同時実行と、1回に投入できる処理量を制限します。
        </p>
      </section>

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {settings && (
        <form
          className="space-y-4 rounded-lg border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <SettingInput
            id="max-concurrent-jobs"
            label="サーバー全体の同時ジョブ数"
            description="通常は1のままにするとNeo4jへの負荷を抑えられます。"
            value={settings.max_concurrent_jobs}
            min={1}
            max={8}
            onChange={(value) =>
              setSettings({ ...settings, max_concurrent_jobs: value })
            }
          />
          <SettingInput
            id="max-user-jobs"
            label="1ユーザーの待機・実行ジョブ数"
            description="連打や同じPlanへの重複投入を防ぐには1を指定します。"
            value={settings.max_concurrent_jobs_per_user}
            min={1}
            max={4}
            onChange={(value) =>
              setSettings({
                ...settings,
                max_concurrent_jobs_per_user: value,
              })
            }
          />
          <SettingInput
            id="max-quizzes-per-job"
            label="1ジョブの総生成数上限"
            description="選択したPlan数 × 各Planの追加数で判定します。"
            value={settings.max_quizzes_per_job}
            min={1}
            max={2000}
            onChange={(value) =>
              setSettings({ ...settings, max_quizzes_per_job: value })
            }
          />
          <div className="flex justify-end border-t pt-4">
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
