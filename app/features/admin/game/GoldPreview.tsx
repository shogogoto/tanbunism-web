import { useId, useState } from "react";
import type { GoldSettings } from "~/features/game/rewards";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { networkFetch } from "~/shared/lib/networkFetch";

type Result = Record<
  "enemy" | "chest",
  { min: number; typical: number; max: number }
>;

export default function GoldPreview({ settings }: { settings: GoldSettings }) {
  const id = useId();
  const [power, setPower] = useState(1000);
  const [achievement, setAchievement] = useState(1);
  const [result, setResult] = useState<{ values: Result; signature: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const signature = JSON.stringify({ settings, power, achievement });
  return (
    <section
      aria-label="Goldの試算"
      className="space-y-3 rounded-lg border p-4"
    >
      <h3 className="font-semibold">Goldの試算</h3>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(undefined);
          try {
            const response = await networkFetch(
              `${import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com"}/admin/game/rewards/gold-preview`,
              {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: signature,
              },
            );
            const data = await response.json();
            if (!response.ok)
              throw new Error(
                typeof data.detail === "string"
                  ? data.detail
                  : "Goldを試算できませんでした。",
              );
            setResult({ values: data, signature });
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Goldを試算できませんでした。",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor={`${id}-power`} className="space-y-1 text-sm">
          Power
          <Input
            id={`${id}-power`}
            aria-label="試算Power"
            className="w-32"
            type="number"
            min={0}
            max={1e9}
            step="any"
            required
            value={Number.isFinite(power) ? power : ""}
            onChange={(e) => setPower(e.target.valueAsNumber)}
          />
        </label>
        <label htmlFor={`${id}-achievement`} className="space-y-1 text-sm">
          達成度
          <Input
            id={`${id}-achievement`}
            aria-label="試算達成度"
            className="w-28"
            type="number"
            min={0}
            max={100000}
            required
            value={Number.isFinite(achievement) ? achievement : ""}
            onChange={(e) => setAchievement(e.target.valueAsNumber)}
          />
        </label>
        <Button disabled={busy} type="submit">
          {busy ? "試算中…" : "試算"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <output className="flex flex-wrap gap-6 text-sm">
          {(["enemy", "chest"] as const).map((source) => (
            <p key={source}>
              {source === "enemy" ? "敵1体" : "宝箱1個"}:{" "}
              {result.values[source].min}〜{result.values[source].max} G（中央{" "}
              {result.values[source].typical} G）
            </p>
          ))}
          {result.signature !== signature && (
            <p className="w-full text-muted-foreground">
              入力・設定が変わりました。再試算してください。
            </p>
          )}
        </output>
      )}
    </section>
  );
}
