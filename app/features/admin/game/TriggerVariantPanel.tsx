import { useState } from "react";
import type {
  GameCatalog,
  TriggerDefinition,
  TriggerVariant,
  TriggerVariantField,
} from "~/features/game/catalog";
import {
  MAX_TRIGGER_VARIANTS,
  MAX_TRIGGER_VARIANT_DEPTH,
  combinationTrigger,
} from "~/features/game/triggerVariantTree";
import {
  resolveTriggerVariantSets,
  triggerVariant,
  triggerVariantFields,
} from "~/features/game/triggerVariants";
import { attachedSets } from "~/features/game/variantCore";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import TriggerVariantSetEditor from "./TriggerVariantSetEditor";
import TriggerVariantValueInput, {
  initialTriggerValue,
} from "./TriggerVariantValueInput";
import { VariantCombinationDialog } from "./VariantCombinationPicker";
import { variantIdentity } from "./VariantSetManager";
import VariantSetPicker from "./VariantSetPicker";
import { variantRowHighlight } from "./variantRowStyles";

type Props = {
  trigger: TriggerDefinition;
  catalog: GameCatalog;
  stateSkills: { id: string; name: string }[];
  onChange: (patch: Partial<TriggerDefinition>) => void;
  onCatalogChange: (catalog: GameCatalog) => void;
  onOpenChange?: (open: boolean) => void;
  parentId?: string;
  depth?: number;
};
export default function TriggerVariantPanel({
  trigger,
  catalog,
  stateSkills,
  onChange,
  onCatalogChange,
  onOpenChange,
  parentId,
  depth = 0,
}: Props) {
  const [error, setError] = useState<string>();
  const [pendingField, setPendingField] = useState<TriggerVariantField>();
  const rows = trigger.variants ?? [];
  const node = rows.find((v) => v.id === parentId);
  const parent = node?.base_variant_id
    ? rows.find((v) => v.id === node.base_variant_id)
    : undefined;
  const inherited = node
    ? (parent?.effective_set_ids ?? trigger.variant_set_ids ?? [])
    : [];
  const selected = node?.effective_set_ids ?? trigger.variant_set_ids ?? [];
  const sets = catalog.trigger_variant_sets ?? [];
  const attached = attachedSets(selected, sets);
  const children = rows.filter(
    (v) => (v.base_variant_id ?? undefined) === parentId,
  );
  const field = node?.child_field ?? trigger.variant_field ?? "threshold";
  const name = node
    ? `${trigger.name}（${node.resolved_name ?? node.name}）`
    : trigger.name;
  const plain = children.filter((v) => !v.variant_selections?.length);
  function change(patch: Partial<TriggerDefinition>) {
    try {
      onChange(patch);
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "変型を更新できませんでした。",
      );
    }
  }
  function updateNode(id: string, patch: Partial<TriggerVariant>) {
    change({
      variants: rows.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  }
  function chooseField(next: TriggerVariantField) {
    const base = triggerVariant(trigger, parentId) ?? trigger;
    const value =
      next === "threshold"
        ? base.threshold
        : initialTriggerValue(next, stateSkills);
    const variants = rows.map((v) =>
      plain.some((c) => c.id === v.id) ? { ...v, field: next, value } : v,
    );
    if (node)
      change({
        variants: variants.map((v) =>
          v.id === node.id ? { ...v, child_field: next } : v,
        ),
      });
    else change({ variant_field: next, variants });
    setPendingField(undefined);
  }
  function remove(id: string) {
    if (rows.some((v) => v.base_variant_id === id)) {
      setError("下位の変型があるため削除できません。");
      return;
    }
    if (
      catalog.shop?.some(
        (p) =>
          "trigger_id" in p &&
          p.trigger_id === trigger.id &&
          p.trigger_variant_id === id,
      ) ||
      catalog.enemies.some((e) =>
        e.gambits?.some(
          (g) => g.trigger_id === trigger.id && g.trigger_variant_id === id,
        ),
      )
    ) {
      setError("使用中の変型は削除できません。");
      return;
    }
    change({ variants: rows.filter((v) => v.id !== id) });
  }
  function registerSet() {
    const id = variantIdentity("set");
    const shared = {
      id,
      name: `${name}の変型`,
      field,
      values: plain.map((v) => ({
        id: v.id,
        name: v.name,
        value: v.value as string | number | boolean,
      })),
    };
    const updated = {
      ...trigger,
      variant_set_ids: node ? trigger.variant_set_ids : [...selected, id],
      variants: rows.map((v) => {
        if (plain.some((c) => c.id === v.id)) {
          const { value: _value, field: _field, ...metadata } = v;
          return {
            ...metadata,
            variant_selections: [{ set_id: id, value_id: v.id }],
          };
        }
        return node && v.id === node.id
          ? { ...v, variant_set_ids: [...(v.variant_set_ids ?? []), id] }
          : v;
      }),
    };
    try {
      onCatalogChange(
        resolveTriggerVariantSets({
          ...catalog,
          trigger_variant_sets: [...sets, shared],
          triggers: catalog.triggers?.map((t) =>
            t.id === trigger.id ? updated : t,
          ),
        }),
      );
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "セットを登録できませんでした。",
      );
    }
  }
  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange?.(open);
        setError(undefined);
        setPendingField(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" data-variant-trigger>
          変型{children.length ? ` ${children.length}` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
        data-dashboard-swipe-ignore
      >
        <DialogTitle className="break-words">{name}の変型</DialogTitle>
        <DialogDescription className="sr-only">
          親の設定を引き継ぎ、一項目またはセットの組み合わせを変更します。
        </DialogDescription>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">共有する変型セット</span>
          <TriggerVariantSetEditor
            catalog={catalog}
            stateSkills={stateSkills}
            onChange={onCatalogChange}
          />
        </div>
        <VariantSetPicker
          sets={sets}
          selected={selected}
          inherited={inherited}
          labels={triggerVariantFields}
          onChange={(ids) =>
            node
              ? updateNode(node.id, {
                  variant_set_ids: ids.filter((id) => !inherited.includes(id)),
                })
              : change({ variant_set_ids: ids })
          }
        />
        <VariantCombinationDialog
          name={name}
          label={`${name}の組み合わせを追加`}
          buttonText="組み合わせを追加"
          attached={attached}
          disabled={rows.length >= MAX_TRIGGER_VARIANTS}
          onChoose={(selections) => {
            const candidate = combinationTrigger(trigger, parentId, selections);
            if (!rows.some((v) => v.id === candidate.id))
              onChange({ variants: [...rows, candidate] });
          }}
        />
        <div className="border-t pt-3 text-sm font-medium">個別の変型</div>
        <label className="grid gap-1 text-sm">
          変更する項目
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={field}
            onChange={(e) =>
              plain.length
                ? setPendingField(e.target.value as TriggerVariantField)
                : chooseField(e.target.value as TriggerVariantField)
            }
          >
            {Object.entries(triggerVariantFields).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {pendingField && (
          <div role="alert" className="space-y-2 rounded border p-2 text-sm">
            <p>
              変更項目を切り替えると値を共通値に戻します。副名と参照IDは維持します。
            </p>
            <Button type="button" onClick={() => chooseField(pendingField)}>
              この項目に切り替える
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingField(undefined)}
            >
              キャンセル
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <fieldset
          disabled={!!pendingField}
          className="min-w-0 space-y-2"
          aria-label="変型の値一覧"
        >
          {children.map((row) => (
            <fieldset
              key={row.id}
              aria-label={row.resolved_name ?? row.name}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_2rem] items-center gap-2 ${variantRowHighlight}`}
            >
              {row.variant_selections?.length ? (
                <span className="break-words text-sm col-span-2">
                  {row.resolved_name ?? row.name}
                </span>
              ) : (
                <>
                  <Input
                    aria-label="変型の副名"
                    maxLength={60}
                    value={row.name}
                    onChange={(e) =>
                      updateNode(row.id, { name: e.target.value })
                    }
                  />
                  <TriggerVariantValueInput
                    field={row.field ?? field}
                    value={row.value}
                    skills={stateSkills}
                    onChange={(value) =>
                      updateNode(row.id, { field: row.field ?? field, value })
                    }
                  />
                </>
              )}
              {depth + 1 < MAX_TRIGGER_VARIANT_DEPTH && (
                <TriggerVariantPanel
                  {...{
                    trigger,
                    catalog,
                    stateSkills,
                    onChange,
                    onCatalogChange,
                  }}
                  parentId={row.id}
                  depth={depth + 1}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                aria-label={`${row.resolved_name ?? row.name}を削除`}
                onClick={() => remove(row.id)}
              >
                ×
              </Button>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={
              rows.length >= MAX_TRIGGER_VARIANTS ||
              (field === "state_skill_id" && !stateSkills.length)
            }
            onClick={() =>
              change({
                variants: [
                  ...rows,
                  {
                    id: variantIdentity("variant"),
                    name: "新しい変型",
                    base_variant_id: parentId,
                    field,
                    value:
                      field === "threshold"
                        ? (triggerVariant(trigger, parentId)?.threshold ??
                          trigger.threshold)
                        : initialTriggerValue(field, stateSkills),
                  },
                ],
              })
            }
          >
            変型を追加
          </Button>
        </fieldset>
        <Button
          type="button"
          variant="outline"
          disabled={
            !plain.length ||
            plain.length > 40 ||
            sets.length >= 100 ||
            selected.some(
              (id) => sets.find((s) => s.id === id)?.field === field,
            )
          }
          onClick={registerSet}
        >
          セットとして登録
        </Button>
      </DialogContent>
    </Dialog>
  );
}
