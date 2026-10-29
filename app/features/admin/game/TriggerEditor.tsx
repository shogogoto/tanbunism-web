import { useEffect, useState } from "react";
import {
  AdminNativeTable,
  AdminTableFrame,
  AdminTableSection,
} from "~/features/admin/AdminTable";
import { type GameCatalog, requestGameCatalog } from "~/features/game/catalog";
import type { TriggerTarget } from "~/features/game/catalog";
import {
  conditionGroup,
  isStateSkill,
  stateCondition,
} from "~/features/game/triggerConditions";
import {
  resolveTriggerVariantSets,
  triggerStatLabels,
  triggerTargets,
} from "~/features/game/triggerVariants";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import DefinitionDeleteButton, {
  pendingDeletionClass,
} from "./DefinitionDeleteButton";
import StatTriggerDetails from "./StatTriggerDetails";
import TriggerVariantPanel from "./TriggerVariantPanel";
import TriggerVariantSetEditor from "./TriggerVariantSetEditor";

const conditions = {
  always: "いつでも",
  ...triggerStatLabels,
  enemy_count: "敵の数",
  state: "状態",
};
export default function TriggerEditor() {
  const [catalog, setCatalog] = useState<GameCatalog>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [variantTrigger, setVariantTrigger] = useState<string>();
  const [deletions, setDeletions] = useState(new Set<string>());
  const stateSkills = catalog?.skills.filter(isStateSkill) ?? [];
  useEffect(() => {
    let active = true;
    void requestGameCatalog(true)
      .then((value) => {
        if (active) setCatalog(value);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function patch(id: string, value: object) {
    if (!catalog) return;
    const next = resolveTriggerVariantSets({
      ...catalog,
      triggers: catalog.triggers?.map((t) =>
        t.id === id ? { ...t, ...value } : t,
      ),
    });
    setCatalog(next);
    setSaved(false);
  }
  return (
    <AdminTableSection
      className="space-y-4 p-4 sm:p-6"
      aria-label="ガンビット条件定義"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">ガンビットのトリガー</h2>
        <div className="flex flex-wrap gap-2">
          {catalog && (
            <TriggerVariantSetEditor
              catalog={catalog}
              stateSkills={stateSkills}
              onChange={(next) => {
                setCatalog(next);
                setSaved(false);
              }}
            />
          )}
          <Button
            disabled={!catalog || busy}
            onClick={() =>
              setCatalog((c) =>
                c
                  ? {
                      ...c,
                      triggers: [
                        ...(c.triggers ?? []),
                        {
                          id: `trigger_${crypto.randomUUID().replaceAll("-", "")}`,
                          name: "新しい条件",
                          condition: "hp_below",
                          threshold: 30,
                          enabled: true,
                          target: "enemy",
                        },
                      ],
                    }
                  : c,
              )
            }
          >
            追加
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!catalog || busy) return;
          const references = catalog.enemies.filter((enemy) =>
            enemy.gambits?.some((rule) => deletions.has(rule.trigger_id)),
          );
          if (references.length) {
            setError(
              `削除するガンビットを${references.map((enemy) => `敵「${enemy.name}」`).join("、")}が使用しています。先に参照を変更してください。`,
            );
            return;
          }
          setBusy(true);
          setError(undefined);
          try {
            const next = {
              ...catalog,
              triggers: catalog.triggers?.filter(
                (trigger) => !deletions.has(trigger.id),
              ),
              shop: catalog.shop?.filter(
                (listing) =>
                  !("trigger_id" in listing) ||
                  !deletions.has(listing.trigger_id),
              ),
            };
            setCatalog(await requestGameCatalog(true, next));
            setDeletions(new Set());
            setSaved(true);
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "保存できませんでした。",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!catalog || busy} className="min-w-0">
          <AdminTableFrame layout="content">
            <AdminNativeTable
              aria-label="ガンビットのトリガー"
              layout="content"
              className="text-sm"
            >
              <thead>
                <tr>
                  {["名前", "対象", "条件", "詳細", "変型", "有効", "削除"].map(
                    (h) => (
                      <th key={h} className="p-2 text-left">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {catalog?.triggers?.map((t) => (
                  <tr
                    key={t.id}
                    aria-label={t.name}
                    data-pending-delete={deletions.has(t.id) || undefined}
                    className={`border-t ${deletions.has(t.id) ? pendingDeletionClass : variantTrigger === t.id ? "bg-primary/10" : ""}`}
                  >
                    <td className="p-2">
                      <Input
                        aria-label="条件の名前"
                        className="w-40"
                        value={t.name}
                        required
                        maxLength={80}
                        onChange={(e) => patch(t.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        aria-label="対象"
                        className="h-9 rounded-md border bg-background px-2"
                        value={t.target ?? ""}
                        onChange={(e) =>
                          patch(t.id, {
                            target: e.target.value as TriggerTarget,
                          })
                        }
                      >
                        {!t.target && (
                          <option value="" disabled>
                            旧設定
                          </option>
                        )}
                        {Object.entries(triggerTargets).map(([key, name]) => (
                          <option key={key} value={key}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        aria-label="判定する条件"
                        className="h-9 rounded-md border bg-background"
                        value={conditionGroup(t.condition, t.stat)}
                        onChange={(e) => {
                          const group = e.target.value;
                          patch(t.id, {
                            condition:
                              group === "hp" || group === "mp"
                                ? `${group}_below`
                                : group in triggerStatLabels
                                  ? "stat"
                                  : group,
                            ...(group in triggerStatLabels
                              ? {
                                  stat: group,
                                  stat_basis:
                                    group === "hp" || group === "mp"
                                      ? "percent"
                                      : "current",
                                  comparison: "below",
                                }
                              : {}),
                            ...stateCondition(t),
                            ...(group === "state" &&
                            conditionGroup(t.condition, t.stat) !== "state"
                              ? {
                                  state_skill_id:
                                    stateSkills.find((skill) => skill.enabled)
                                      ?.id ?? null,
                                }
                              : {}),
                            ...(group === "enemy_count"
                              ? { threshold: Math.min(t.threshold, 20) }
                              : {}),
                          });
                        }}
                      >
                        {Object.entries(conditions).map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {(t.condition === "stat" ||
                          t.condition.startsWith("hp_") ||
                          t.condition.startsWith("mp_")) && (
                          <StatTriggerDetails
                            trigger={t}
                            onChange={(value) => patch(t.id, value)}
                          />
                        )}
                        {t.condition === "enemy_count" && (
                          <>
                            <Input
                              aria-label="しきい値"
                              type="number"
                              min={1}
                              max={t.condition === "enemy_count" ? 20 : 100}
                              value={
                                Number.isFinite(t.threshold) ? t.threshold : ""
                              }
                              required
                              className="w-24"
                              onChange={(e) =>
                                patch(t.id, {
                                  threshold: e.target.valueAsNumber,
                                })
                              }
                            />
                            <span>体以上</span>
                          </>
                        )}
                        {conditionGroup(t.condition) === "state" && (
                          <>
                            <select
                              aria-label="判定する状態"
                              required
                              className="h-9 rounded-md border bg-background px-2"
                              value={t.state_skill_id ?? ""}
                              onChange={(e) =>
                                patch(t.id, {
                                  condition: "state",
                                  ...stateCondition(t),
                                  state_skill_id: e.target.value || null,
                                })
                              }
                            >
                              <option value="" disabled>
                                状態スキルを選択
                              </option>
                              {t.state_skill_id &&
                                !stateSkills.some(
                                  (skill) => skill.id === t.state_skill_id,
                                ) && (
                                  <option value={t.state_skill_id}>
                                    利用不可：{t.state_skill_id}
                                  </option>
                                )}
                              {stateSkills.map((skill) => (
                                <option key={skill.id} value={skill.id}>
                                  {skill.name}
                                  {!skill.enabled && "（無効）"}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label="状態の有無"
                              className="h-9 rounded-md border bg-background px-2"
                              value={String(stateCondition(t).state_present)}
                              onChange={(e) =>
                                patch(t.id, {
                                  condition: "state",
                                  ...stateCondition(t),
                                  state_present: e.target.value === "true",
                                })
                              }
                            >
                              <option value="true">あり</option>
                              <option value="false">なし</option>
                            </select>
                          </>
                        )}
                        {t.condition === "always" && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <TriggerVariantPanel
                        trigger={t}
                        catalog={catalog}
                        onCatalogChange={(next) => {
                          setCatalog(next);
                          setSaved(false);
                        }}
                        stateSkills={stateSkills}
                        onChange={(value) => patch(t.id, value)}
                        onOpenChange={(open) =>
                          setVariantTrigger(open ? t.id : undefined)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        aria-label="有効"
                        type="checkbox"
                        checked={t.enabled}
                        onChange={(e) =>
                          patch(t.id, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <DefinitionDeleteButton
                        removed={deletions.has(t.id)}
                        onClick={() => {
                          setDeletions((current) => {
                            const next = new Set(current);
                            if (next.has(t.id)) next.delete(t.id);
                            else next.add(t.id);
                            return next;
                          });
                          setSaved(false);
                          setError(undefined);
                          if (variantTrigger === t.id)
                            setVariantTrigger(undefined);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminNativeTable>
          </AdminTableFrame>
          {deletions.size > 0 && (
            <output className="block mt-2 text-sm text-muted-foreground">
              削除予約 {deletions.size}件 · 保存で確定します。
            </output>
          )}
          <div className="flex justify-center mt-4">
            <Button type="submit">保存</Button>
          </div>
        </fieldset>
      </form>
      {saved && <output>保存しました</output>}
    </AdminTableSection>
  );
}
