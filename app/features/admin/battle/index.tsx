import { useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { type BattleSettings, requestBattleSettings } from "./api";

const types = {
  sent2term: "単文 → 用語",
  term2sent: "用語 → 単文",
  pair2rel: "単文組 → 関係",
  rel2pair: "関係 → 単文組",
} as const;
export default function BattleSettingsManager() {
  const [settings, setSettings] = useState<BattleSettings>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    requestBattleSettings().then(
      (value) => {
        if (active) setSettings(value);
      },
      (cause) => {
        if (active) setError(cause.message);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">戦闘の制限時間</h2>
      <p className="text-sm text-muted-foreground">
        基本秒数 ×
        種類別の重み（秒単位に切り上げ）。新しい出題から適用。通常の復習には影響しません。
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {saved && <output className="block">戦闘設定を保存しました</output>}
      {settings && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            setError(undefined);
            setSaved(false);
            void requestBattleSettings(settings)
              .then((value) => {
                setSettings(value);
                setSaved(true);
              })
              .catch((cause) => setError(cause.message))
              .finally(() => setSaving(false));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="battle-base">基本秒数</Label>
            <Input
              id="battle-base"
              type="number"
              min={5}
              max={300}
              step={1}
              required
              disabled={saving}
              value={settings.base_seconds}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  base_seconds: Number(event.target.value),
                })
              }
            />
          </div>
          {Object.entries(types).map(([key, label]) => {
            const kind = key as keyof typeof types;
            return (
              <div key={kind} className="space-y-2">
                <Label htmlFor={`battle-${kind}`}>{label}の重み</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id={`battle-${kind}`}
                    type="number"
                    min={0.5}
                    max={5}
                    step={0.1}
                    required
                    disabled={saving}
                    value={settings[kind]}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        [kind]: Number(event.target.value),
                      })
                    }
                  />
                  <output className="w-16 shrink-0 tabular-nums">
                    {Math.ceil(settings.base_seconds * settings[kind])}秒
                  </output>
                </div>
              </div>
            );
          })}
          <Button disabled={saving} type="submit">
            {saving ? "保存中…" : "保存"}
          </Button>
        </form>
      )}
    </section>
  );
}
