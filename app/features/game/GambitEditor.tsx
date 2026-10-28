import { useState } from "react";
import useSWR from "swr";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import GameIcon from "./GameIcon";
import { gameRequest } from "./battle";
import { type GambitRule, requestGameCatalog } from "./catalog";
import type { GameSave } from "./domain";
import { firstAvailableTriggerVariant, triggerAvailable } from "./gambitShop";
import type { GameState } from "./state";
import { hasThreshold, stateCondition } from "./triggerConditions";
import {
  triggerDescription,
  triggerTargets,
  triggerVariant,
} from "./triggerVariants";

const selectClass = "h-9 min-w-0 rounded-md border bg-background px-2 text-sm";
const conditionLabels = {
  always: "いつでも",
  hp_below: "自分のHPが未満（%）",
  hp_above: "自分のHPが以上（%）",
  hp_equal: "自分のHPが同じ（%）",
  mp_below: "自分のMPが未満（%）",
  mp_above: "自分のMPが以上（%）",
  mp_equal: "自分のMPが同じ（%）",
  enemy_count: "敵の数が以上",
  stat: "ステータス",
  state: "自分の状態",
};
export default function GambitEditor({
  save,
  revision,
  onSaved,
  disabled = false,
  level = 1,
}: {
  save: GameSave;
  revision: number;
  onSaved: (state: GameState) => void;
  disabled?: boolean;
  level?: number;
}) {
  const { data: catalog, error: loadError } = useSWR("game-catalog", () =>
    requestGameCatalog(),
  );
  const { data: capacity, error: capacityError } = useSWR(
    ["game-gambit-capacity", level, revision],
    () =>
      gameRequest<{ slots: number; next_level: number | null }>(
        "gambits/capacity",
      ),
  );
  const slots = capacity?.slots ?? 1;
  const unlocked = save.economy?.unlocked_triggers ?? [];
  const availableTriggers = catalog?.triggers?.filter(
    (t) => firstAvailableTriggerVariant(catalog, unlocked, t) !== undefined,
  );
  const triggerOptions =
    catalog?.triggers?.map((t) => ({
      id: t.id,
      name: t.name,
      disabled:
        firstAvailableTriggerVariant(catalog, unlocked, t) === undefined,
    })) ??
    Object.entries(conditionLabels).map(([id, name]) => ({
      id,
      name,
      disabled: false,
    }));
  const [rules, setRules] = useState<(GambitRule & { rowId: string })[]>(() =>
    (save.gambits ?? []).map((rule) => ({
      ...rule,
      rowId: crypto.randomUUID(),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const combatSkills =
    catalog?.skills.filter(
      (s) =>
        s.enabled &&
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
  const skills = combatSkills.filter((skill) =>
    catalog?.player_skills?.some((u) => u.enabled && u.skill_id === skill.id),
  );
  const specialties = (save.specialties ?? [])
    .filter((s) => s.equipped)
    .map((s) => ({
      ...s,
      icon:
        catalog?.skills.find((skill) => skill.id === s.skill_id)?.icon ??
        "book",
    }));
  const items =
    catalog?.items.filter(
      (i) =>
        i.enabled &&
        i.kind === "consumable" &&
        combatSkills.some((s) => s.id === i.skill_id),
    ) ?? [];
  const patch = (index: number, value: Partial<GambitRule>) => {
    setRules((current) =>
      current.map((r, i) => (i === index ? { ...r, ...value } : r)),
    );
    setSaved(false);
  };
  const reorder = (index: number, step: number) => {
    setRules((current) => {
      const next = [...current];
      [next[index], next[index + step]] = [next[index + step], next[index]];
      return next;
    });
    setSaved(false);
  };
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving || disabled || !capacity || rules.length > slots) return;
        setSaving(true);
        setSaved(false);
        setError(undefined);
        try {
          onSaved(
            await gameRequest<GameState>(
              "gambits",
              {
                revision,
                rules: rules.map(({ rowId: _rowId, ...rule }) => rule),
              },
              "PUT",
            ),
          );
          setSaved(true);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "保存できませんでした。",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      {capacity && (
        <p className="text-sm tabular-nums">
          ガンビット {rules.length}/{slots}枠
          {capacity.next_level !== null && ` · 次はLv.${capacity.next_level}`}
        </p>
      )}
      {rules.length > slots && (
        <p role="alert" className="text-destructive text-sm">
          開放枠を超えたルールは実行されません。枠数以内に減らして保存してください。
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        ターン終了時に上から判定し、実行できる最初の1件を自動で使います。
      </p>
      {(error || loadError || capacityError) && (
        <p role="alert" className="text-destructive">
          {error ?? loadError?.message ?? capacityError?.message}
        </p>
      )}
      <fieldset disabled={disabled || saving || !catalog} className="space-y-3">
        {rules.map((rule, index) => {
          const options =
            rule.action === "specialty"
              ? specialties
              : rule.action === "skill"
                ? skills
                : items;
          const selected = options.find((o) => o.id === rule.definition_id);
          const triggerRoot = catalog?.triggers?.find(
            (t) => t.id === rule.trigger_id,
          );
          const trigger = triggerRoot
            ? triggerVariant(triggerRoot, rule.trigger_variant_id)
            : undefined;
          const fixedTarget = trigger?.target;
          return (
            <section
              key={rule.rowId}
              aria-label={`ガンビット ${index + 1}`}
              className="space-y-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-2">
                {index >= slots && (
                  <span className="text-xs text-muted-foreground">未開放</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <label className="mr-auto flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) =>
                      patch(index, { enabled: e.target.checked })
                    }
                  />
                  有効
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`${index + 1}番を上へ`}
                  disabled={!index}
                  onClick={() => reorder(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`${index + 1}番を下へ`}
                  disabled={index === rules.length - 1}
                  onClick={() => reorder(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`${index + 1}番を削除`}
                  onClick={() => {
                    setRules((current) =>
                      current.filter((_, i) => i !== index),
                    );
                    setSaved(false);
                  }}
                >
                  削除
                </Button>
              </div>
              <div className="flex gap-2">
                <label className="grid min-w-0 flex-1 gap-1 text-sm">
                  条件
                  <select
                    className={selectClass}
                    value={
                      rule.trigger_id ??
                      (catalog?.shop?.some((row) => "trigger_id" in row)
                        ? ""
                        : rule.condition)
                    }
                    onChange={(e) =>
                      patch(index, {
                        condition:
                          catalog?.triggers?.find(
                            (t) => t.id === e.target.value,
                          )?.condition ??
                          (e.target.value as GambitRule["condition"]),
                        trigger_id:
                          catalog?.triggers?.find(
                            (t) => t.id === e.target.value,
                          )?.id ?? null,
                        trigger_variant_id: (() => {
                          const selected = catalog?.triggers?.find(
                            (t) => t.id === e.target.value,
                          );
                          return selected && catalog
                            ? firstAvailableTriggerVariant(
                                catalog,
                                unlocked,
                                selected,
                              )
                            : null;
                        })(),
                        target:
                          catalog?.triggers?.find(
                            (t) => t.id === e.target.value,
                          )?.target ?? rule.target,
                        threshold:
                          catalog?.triggers?.find(
                            (t) => t.id === e.target.value,
                          )?.threshold ?? rule.threshold,
                        ...stateCondition(
                          catalog?.triggers?.find(
                            (t) => t.id === e.target.value,
                          ) ?? {
                            condition: e.target
                              .value as GambitRule["condition"],
                          },
                        ),
                      })
                    }
                  >
                    {catalog?.triggers && (
                      <option value="" disabled>
                        トリガーを選択
                      </option>
                    )}
                    {triggerOptions.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                        disabled={option.disabled}
                      >
                        {option.name}
                        {option.disabled && "（未解放・無効）"}
                      </option>
                    ))}
                  </select>
                </label>
                {(!!triggerRoot?.variants?.length ||
                  !!rule.trigger_variant_id) && (
                  <label className="grid min-w-0 flex-1 gap-1 text-sm">
                    変型
                    <select
                      className={selectClass}
                      value={rule.trigger_variant_id ?? ""}
                      onChange={(e) =>
                        patch(index, {
                          trigger_variant_id: e.target.value || null,
                        })
                      }
                    >
                      <option
                        value=""
                        disabled={
                          !!catalog &&
                          !!triggerRoot &&
                          !triggerAvailable(catalog, unlocked, triggerRoot.id)
                        }
                      >
                        基本
                      </option>
                      {rule.trigger_variant_id && !trigger && (
                        <option value={rule.trigger_variant_id}>
                          利用不可
                        </option>
                      )}
                      {triggerRoot?.variants?.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                          disabled={
                            !!catalog &&
                            !triggerAvailable(
                              catalog,
                              unlocked,
                              triggerRoot.id,
                              v.id,
                            )
                          }
                        >
                          {v.resolved_name ?? v.name}
                          {!!catalog &&
                            !triggerAvailable(
                              catalog,
                              unlocked,
                              triggerRoot.id,
                              v.id,
                            ) &&
                            "（未解放）"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {!fixedTarget &&
                  !rule.trigger_variant_id &&
                  hasThreshold(
                    catalog?.triggers?.find((t) => t.id === rule.trigger_id)
                      ?.condition ?? rule.condition,
                  ) && (
                    <label
                      htmlFor={`${rule.rowId}-threshold`}
                      className="w-20 text-sm"
                    >
                      値
                      <Input
                        id={`${rule.rowId}-threshold`}
                        type="number"
                        required
                        min={1}
                        max={rule.condition === "enemy_count" ? 20 : 100}
                        value={
                          Number.isFinite(rule.threshold) ? rule.threshold : ""
                        }
                        onChange={(e) =>
                          patch(index, { threshold: e.target.valueAsNumber })
                        }
                      />
                    </label>
                  )}
              </div>
              {trigger && (fixedTarget || rule.trigger_variant_id) && (
                <p
                  className="text-sm text-muted-foreground"
                  aria-label="条件の詳細"
                >
                  {triggerDescription(trigger)}
                  {trigger.condition === "state" &&
                    ` · ${catalog?.skills.find((s) => s.id === trigger.state_skill_id)?.name ?? "状態"} ${trigger.state_present === false ? "なし" : "あり"}`}
                </p>
              )}
              <div className="flex items-end gap-2">
                <label className="grid gap-1 text-sm">
                  対象
                  <select
                    className={selectClass}
                    disabled={!!fixedTarget}
                    value={fixedTarget ?? rule.target ?? ""}
                    onChange={(e) =>
                      patch(index, {
                        target: e.target.value
                          ? (e.target.value as GambitRule["target"])
                          : null,
                      })
                    }
                  >
                    <option value="">自動（既存設定）</option>
                    {Object.entries(triggerTargets).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  行動
                  <select
                    className={selectClass}
                    value={rule.action}
                    onChange={(e) => {
                      const action = e.target.value as GambitRule["action"];
                      patch(index, {
                        action,
                        definition_id:
                          (action === "specialty"
                            ? specialties
                            : action === "skill"
                              ? skills
                              : items)[0]?.id ?? "",
                      });
                    }}
                  >
                    <option value="skill">スキル</option>
                    <option value="item">アイテム</option>
                    <option value="specialty">専門分野</option>
                  </select>
                </label>
                <label className="grid min-w-0 flex-1 gap-1 text-sm">
                  使用するもの
                  <select
                    className={selectClass}
                    value={rule.definition_id}
                    required
                    onChange={(e) =>
                      patch(index, { definition_id: e.target.value })
                    }
                  >
                    <option value="" disabled>
                      選択
                    </option>
                    {!selected && rule.definition_id && (
                      <option value={rule.definition_id}>
                        利用不可：{rule.definition_id}
                      </option>
                    )}
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {"mp_cost" in option
                          ? ` · MP ${option.mp_cost}`
                          : ` · 所持 ${save.economy?.inventory[option.id] ?? 0}`}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <GameIcon
                    icon={selected.icon}
                    className="mb-2 size-6 shrink-0"
                  />
                )}
              </div>
            </section>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={
            !capacity ||
            rules.length >= slots ||
            (availableTriggers !== undefined && !availableTriggers.length) ||
            (!skills.length && !items.length)
          }
          onClick={() => {
            const initial = availableTriggers?.[0];
            setRules((current) => [
              ...current,
              {
                rowId: crypto.randomUUID(),
                enabled: true,
                condition: "always",
                threshold: 30,
                action: skills.length ? "skill" : "item",
                definition_id: (skills[0] ?? items[0]).id,
                ...(initial
                  ? {
                      trigger_id: initial.id,
                      trigger_variant_id: catalog
                        ? firstAvailableTriggerVariant(
                            catalog,
                            unlocked,
                            initial,
                          )
                        : null,
                      condition: initial.condition,
                      threshold: initial.threshold,
                      target: initial.target,
                      ...stateCondition(initial),
                    }
                  : {}),
              },
            ]);
            setSaved(false);
          }}
        >
          条件を追加
        </Button>
      </fieldset>
      <div
        className="rounded-md border p-3 text-sm"
        aria-label="デフォルトガンビット"
      >
        最下位：いつでも → 戦う（反撃・物理・敵1体）
        <p className="text-muted-foreground">
          上の行を実行できないときに使用 · 枠の消費なし
        </p>
      </div>
      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={
            disabled || saving || !catalog || !capacity || rules.length > slots
          }
        >
          {saving ? "保存中…" : "保存"}
        </Button>
      </div>
      {disabled && (
        <p className="text-sm text-muted-foreground">
          戦闘を終えてから変更できます。
        </p>
      )}
      {saved && <output>ガンビットを保存しました</output>}
    </form>
  );
}
