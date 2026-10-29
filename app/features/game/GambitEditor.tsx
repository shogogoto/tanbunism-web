import { useState } from "react";
import useSWR from "swr";
import { Button } from "~/shared/components/ui/button";
import { gameRequest } from "./battle";
import { type GambitRule, requestGameCatalog } from "./catalog";
import type { GameSave } from "./domain";
import { triggerAvailable, triggerUnlockId } from "./gambitShop";
import type { GameState } from "./state";
import {
  triggerDescription,
  triggerTargets,
  triggerVariant,
} from "./triggerVariants";

type Selection = Pick<
  GambitRule,
  "enabled" | "action" | "definition_id" | "trigger_id" | "trigger_variant_id"
>;
const selectClass =
  "h-9 min-w-0 w-full rounded-md border bg-background px-2 text-sm";

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
  const triggers = (catalog?.triggers ?? []).flatMap((root) =>
    [null, ...(root.variants ?? []).map((variant) => variant.id)].flatMap(
      (variantId) => {
        if (
          !catalog ||
          !triggerAvailable(catalog, unlocked, root.id, variantId)
        )
          return [];
        const trigger = triggerVariant(root, variantId);
        if (!trigger) return [];
        const variant = root.variants?.find((v) => v.id === variantId);
        return [
          {
            key: triggerUnlockId(root.id, variantId),
            id: root.id,
            variantId,
            name: variant
              ? `${root.name}（${variant.resolved_name ?? variant.name}）`
              : root.name,
            trigger,
          },
        ];
      },
    ),
  );
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
  const actionGroups: {
    label: string;
    options: {
      key: string;
      action: Selection["action"];
      id: string;
      name: string;
      icon: string;
    }[];
  }[] = [
    {
      label: "習得スキル",
      options: combatSkills
        .filter((s) =>
          catalog?.player_skills?.some((u) => u.enabled && u.skill_id === s.id),
        )
        .map((s) => ({
          key: `skill:${s.id}`,
          action: "skill" as const,
          id: s.id,
          name: `${s.name} · MP ${s.mp_cost}`,
          icon: s.icon,
        })),
    },
    {
      label: "所持アイテム",
      options: (catalog?.items ?? []).flatMap((item) => {
        const skill = combatSkills.find((s) => s.id === item.skill_id);
        const quantity = save.economy?.inventory[item.id] ?? 0;
        return item.enabled &&
          item.kind === "consumable" &&
          skill &&
          quantity > 0
          ? [
              {
                key: `item:${item.id}`,
                action: "item" as const,
                id: item.id,
                name: `${item.name}：${skill.name} · 所持 ${quantity}`,
                icon: item.icon,
              },
            ]
          : [];
      }),
    },
    {
      label: "装備専門分野",
      options: (save.specialties ?? []).flatMap((specialty) => {
        const skill = combatSkills.find((s) => s.id === specialty.skill_id);
        return specialty.equipped &&
          skill &&
          catalog?.specialty_skills?.some(
            (u) => u.enabled && u.skill_id === skill.id,
          )
          ? [
              {
                key: `specialty:${specialty.id}`,
                action: "specialty" as const,
                id: specialty.id,
                name: `${specialty.name}：${skill.name}`,
                icon: skill.icon,
              },
            ]
          : [];
      }),
    },
  ];
  const actions = actionGroups.flatMap((group) => group.options);
  const [rules, setRules] = useState<(Selection & { rowId: string })[]>(() =>
    (save.gambits ?? []).map((rule) => ({
      rowId: crypto.randomUUID(),
      enabled: rule.enabled,
      trigger_id: rule.trigger_id,
      trigger_variant_id: rule.trigger_variant_id ?? null,
      action: rule.action,
      definition_id: rule.definition_id,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const valid = rules.every(
    (rule) =>
      triggers.some(
        (t) =>
          t.id === rule.trigger_id &&
          t.variantId === (rule.trigger_variant_id ?? null),
      ) &&
      actions.some(
        (a) => a.action === rule.action && a.id === rule.definition_id,
      ),
  );
  function patch(index: number, value: Partial<Selection>) {
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...value } : rule)),
    );
    setSaved(false);
  }
  function reorder(index: number, step: number) {
    setRules((current) => {
      const next = [...current];
      [next[index], next[index + step]] = [next[index + step], next[index]];
      return next;
    });
    setSaved(false);
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          saving ||
          disabled ||
          !catalog ||
          !capacity ||
          rules.length > slots ||
          !valid
        )
          return;
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
        上から判定し、実行できる最初の1件を自動で使います。
      </p>
      {(error || loadError || capacityError) && (
        <p role="alert" className="text-destructive">
          {error ?? loadError?.message ?? capacityError?.message}
        </p>
      )}
      {catalog && !triggers.length && (
        <p className="text-sm text-muted-foreground">
          トリガーを入手すると設定できます。ショップで購入できます。
        </p>
      )}
      <fieldset disabled={disabled || saving || !catalog} className="space-y-3">
        {rules.map((rule, index) => {
          const triggerKey = rule.trigger_id
            ? triggerUnlockId(rule.trigger_id, rule.trigger_variant_id)
            : "";
          const trigger = triggers.find((t) => t.key === triggerKey);
          const actionKey = `${rule.action}:${rule.definition_id}`;
          const selected = actions.find((a) => a.key === actionKey);
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 text-sm">
                  トリガー
                  <select
                    required
                    className={selectClass}
                    value={triggerKey}
                    onChange={(e) => {
                      const next = triggers.find(
                        (t) => t.key === e.target.value,
                      );
                      if (next)
                        patch(index, {
                          trigger_id: next.id,
                          trigger_variant_id: next.variantId,
                        });
                    }}
                  >
                    <option value="" disabled>
                      トリガーを選択
                    </option>
                    {!trigger && triggerKey && (
                      <option disabled value={triggerKey}>
                        利用不可：{triggerKey}
                      </option>
                    )}
                    {triggers.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid min-w-0 gap-1 text-sm">
                  スキル
                  <select
                    required
                    className={selectClass}
                    value={actionKey}
                    onChange={(e) => {
                      const next = actions.find(
                        (a) => a.key === e.target.value,
                      );
                      if (next)
                        patch(index, {
                          action: next.action,
                          definition_id: next.id,
                        });
                    }}
                  >
                    <option value="" disabled>
                      スキルを選択
                    </option>
                    {!selected && (
                      <option disabled value={actionKey}>
                        利用不可：{rule.definition_id}
                      </option>
                    )}
                    {actionGroups
                      .filter((group) => group.options.length)
                      .map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((a) => (
                            <option key={a.key} value={a.key}>
                              {a.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                  </select>
                </label>
              </div>
              {trigger && (
                <p
                  className="text-sm text-muted-foreground"
                  aria-label="条件の詳細"
                >
                  {trigger.trigger.target &&
                    `${triggerTargets[trigger.trigger.target]} · `}
                  {triggerDescription(trigger.trigger)}
                  {trigger.trigger.condition === "state" &&
                    ` · ${catalog?.skills.find((s) => s.id === trigger.trigger.state_skill_id)?.name ?? "状態"} ${trigger.trigger.state_present === false ? "なし" : "あり"}`}
                </p>
              )}
              {catalog && (!trigger || !selected) && (
                <p className="text-sm text-destructive">
                  利用可能なトリガーとスキルを選び直すか、この行を削除してください。
                </p>
              )}
            </section>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={
            !capacity ||
            rules.length >= slots ||
            !triggers.length ||
            !actions.length
          }
          onClick={() => {
            const trigger = triggers[0];
            const action = actions[0];
            if (!trigger || !action) return;
            setRules((current) => [
              ...current,
              {
                rowId: crypto.randomUUID(),
                enabled: true,
                trigger_id: trigger.id,
                trigger_variant_id: trigger.variantId,
                action: action.action,
                definition_id: action.id,
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
            disabled ||
            saving ||
            !catalog ||
            !capacity ||
            rules.length > slots ||
            !valid
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
