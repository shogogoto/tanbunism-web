import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import type { PowerWeights } from "~/features/gamification/PowerBreakdown";
import { invalidateGamification } from "~/features/gamification/invalidate";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { requestPowerWeights } from "./api";

const labels = {
  sentence: "単文",
  term: "用語",
  logic: "論理関係",
  reference: "参照関係",
  abstraction: "具体・抽象関係",
} as const;
type Inputs = Record<keyof PowerWeights, string>;
const toInputs = (weights: PowerWeights) =>
  Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, String(value)]),
  ) as Inputs;

export default function PowerSettingsManager() {
  const { mutate } = useSWRConfig();
  const [inputs, setInputs] = useState<Inputs>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    requestPowerWeights().then(
      (weights) => {
        if (active)
          setInputs(
            toInputs({ ...weights, abstraction: weights.abstraction ?? 2 }),
          );
      },
      () => {
        if (active) setError("Power設定を取得できませんでした。");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!inputs) return;
    const weights = Object.fromEntries(
      Object.entries(inputs).map(([key, value]) => [key, Number(value)]),
    ) as PowerWeights;
    if (
      Object.values(weights).some(
        (value) => !Number.isInteger(value) || value < 0 || value > 10000,
      )
    )
      return;
    setSaving(true);
    setError(undefined);
    try {
      const saved = await requestPowerWeights(weights);
      setInputs(toInputs(saved));
      await invalidateGamification(mutate);
      toast.success("Power設定を更新しました");
    } catch {
      setError(
        "Power設定の保存・表示更新に失敗しました。設定を再確認してください。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Power設定</h2>
      <p className="text-sm text-muted-foreground">
        Powerは単文・用語・論理関係・参照関係・具体と抽象の関係の件数に、それぞれの重みを掛けた合計です。
        変更してもLv・XPには影響しません。
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {inputs ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {(Object.keys(labels) as (keyof PowerWeights)[]).map((key) => (
            <div
              key={key}
              className="grid grid-cols-[1fr_8rem] items-center gap-3"
            >
              <Label htmlFor={`power-${key}`}>{labels[key]}の重み</Label>
              <Input
                id={`power-${key}`}
                type="number"
                min={0}
                max={10000}
                step={1}
                required
                disabled={saving}
                value={inputs[key]}
                onChange={(event) =>
                  setInputs({ ...inputs, [key]: event.target.value })
                }
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            0で加点なし。取り込み済みリソースにも次回取得から適用します。
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </form>
      ) : (
        !error && <p className="text-sm text-muted-foreground">設定を取得中…</p>
      )}
    </div>
  );
}
