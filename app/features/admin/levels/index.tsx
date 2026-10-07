import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { invalidateGamification } from "~/features/gamification/invalidate";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { requestLevelSettings } from "./api";

export default function LevelSettingsManager() {
  const { mutate } = useSWRConfig();
  const [coefficient, setCoefficient] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    requestLevelSettings().then(
      (settings) => {
        if (active) setCoefficient(String(settings.level_xp_coefficient));
      },
      () => {
        if (active) setError("レベル設定を取得できませんでした。");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    const value = Number(coefficient);
    if (!Number.isInteger(value) || value < 1 || value > 10000) return;
    setSaving(true);
    setError(undefined);
    try {
      const settings = await requestLevelSettings({
        level_xp_coefficient: value,
      });
      setCoefficient(String(settings.level_xp_coefficient));
      await invalidateGamification(mutate);
      toast.success("レベル設定を更新しました");
    } catch {
      setError(
        "レベル設定の保存・表示更新に失敗しました。設定を再確認してください。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">レベル設定</h2>
      <p className="text-sm text-muted-foreground">
        ユーザー・リソース共通。次のLvまで：現在Lv × 係数 XP。
        変更しても獲得済みXP・Powerは変わりません。
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {coefficient === undefined ? (
        !error && <p className="text-sm text-muted-foreground">設定を取得中…</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Label htmlFor="level-xp-coefficient">レベルXP係数</Label>
          <Input
            id="level-xp-coefficient"
            type="number"
            min={1}
            max={10000}
            step={1}
            required
            value={coefficient}
            disabled={saving}
            onChange={(event) => setCoefficient(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            初期値10：Lv.1→2 は10XP、Lv.2→3 は20XP。
            保存後、全ユーザー・全リソースのLvとゲージを再計算します。
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </form>
      )}
    </div>
  );
}
