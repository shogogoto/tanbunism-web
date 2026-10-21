import { useEffect, useState } from "react";
import {
  type GameCatalog,
  type SpecialtySkillUse,
  requestGameCatalog,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";

/** Usage permissions and quiz policy belong to the consumer, not the effect. */
export default function SkillUsageEditor() {
  const [catalog, setCatalog] = useState<GameCatalog>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void requestGameCatalog(true)
      .then((c) => {
        if (active) setCatalog(c);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function change(
    key: "player_skills" | "specialty_skills",
    value: GameCatalog[typeof key],
  ) {
    setSaved(false);
    setCatalog((c) => (c ? { ...c, [key]: value } : c));
  }
  return (
    <section
      className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4"
      aria-label="スキルの利用設定"
    >
      <h2 className="text-lg font-semibold">スキルの利用設定</h2>
      <p className="text-sm text-muted-foreground">
        アイテムと敵の使用スキルは、それぞれのタブで設定します。
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!catalog && !error && <p>読み込み中…</p>}
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!catalog || busy) return;
          setBusy(true);
          setError(undefined);
          setSaved(false);
          try {
            setCatalog(await requestGameCatalog(true, catalog));
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "保存できませんでした。");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!catalog || busy} className="space-y-6">
          {(["player_skills", "specialty_skills"] as const).map((key) => {
            const specialty = key === "specialty_skills";
            const title = specialty ? "専門分野" : "プレイヤー";
            const uses = catalog?.[key] ?? [];
            const available =
              catalog?.skills.filter(
                (s) =>
                  !uses.some((u) => u.skill_id === s.id) &&
                  [
                    "attack",
                    "heal_hp",
                    "heal_mp",
                    "damage_mp",
                    "buff",
                    "debuff",
                    "ailment",
                  ].includes(s.effect),
              ) ?? [];
            const patch = (index: number, value: object) =>
              change(
                key,
                uses.map((u, i) => (i === index ? { ...u, ...value } : u)),
              );
            return (
              <section key={key} aria-label={`${title}のスキル利用`}>
                <div className="mb-2 flex justify-between gap-2">
                  <h3 className="font-semibold">{title}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!available.length}
                    aria-label={`${title}の使用スキルを追加`}
                    onClick={() =>
                      change(key, [
                        ...uses,
                        {
                          skill_id: available[0].id,
                          enabled: true,
                          ...(specialty
                            ? {
                                quiz_required: true,
                                quiz_seconds: 30,
                                wrong_multiplier: 0,
                                power_coefficient: 1,
                              }
                            : {}),
                        },
                      ])
                    }
                  >
                    追加
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full whitespace-nowrap text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        {[
                          "スキル",
                          ...(specialty
                            ? ["専用クイズ", "秒数 / 問", "Power係数"]
                            : []),
                          "有効",
                        ].map((h) => (
                          <th key={h} scope="col" className="p-2 text-left">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uses.map((u, i) => {
                        const policy = u as SpecialtySkillUse;
                        return (
                          <tr
                            key={u.skill_id}
                            className="border-t [&>td]:p-2"
                            aria-label={
                              catalog?.skills.find((s) => s.id === u.skill_id)
                                ?.name
                            }
                          >
                            <td>
                              <select
                                className="h-9 rounded-md border bg-background px-2"
                                aria-label="使用スキル"
                                value={u.skill_id}
                                onChange={(e) =>
                                  patch(i, { skill_id: e.target.value })
                                }
                              >
                                {catalog?.skills
                                  .filter(
                                    (s) =>
                                      s.id === u.skill_id ||
                                      available.some((a) => a.id === s.id),
                                  )
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            {specialty && (
                              <>
                                <td>
                                  <input
                                    type="checkbox"
                                    aria-label="専用クイズ"
                                    checked={policy.quiz_required}
                                    onChange={(e) =>
                                      patch(i, {
                                        quiz_required: e.target.checked,
                                      })
                                    }
                                  />
                                </td>
                                {(
                                  [
                                    ["秒数 / 問", "quiz_seconds", 5, 300, 1],
                                    [
                                      "Power係数",
                                      "power_coefficient",
                                      0,
                                      1000,
                                      0.1,
                                    ],
                                  ] as const
                                ).map(([label, field, min, max, step]) => (
                                  <td key={field}>
                                    <Input
                                      className="w-24"
                                      aria-label={label}
                                      type="number"
                                      required
                                      min={min}
                                      max={max}
                                      step={step}
                                      value={
                                        Number.isFinite(policy[field])
                                          ? policy[field]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        patch(i, {
                                          [field]: e.target.valueAsNumber,
                                        })
                                      }
                                    />
                                  </td>
                                ))}
                              </>
                            )}
                            <td>
                              <input
                                type="checkbox"
                                aria-label="有効"
                                checked={u.enabled}
                                onChange={(e) =>
                                  patch(i, { enabled: e.target.checked })
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {!uses.length && (
                        <tr>
                          <td
                            className="p-3 text-muted-foreground"
                            colSpan={specialty ? 6 : 2}
                          >
                            未登録
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </fieldset>
        <div className="flex justify-center">
          <Button type="submit" disabled={!catalog || busy}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </div>
        {saved && <output className="block text-center">保存しました</output>}
      </form>
    </section>
  );
}
