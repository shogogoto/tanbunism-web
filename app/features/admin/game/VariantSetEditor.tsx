import { X } from "lucide-react";
import { useState } from "react";
import {
  type GameCatalog,
  resolveCatalogTemplates,
  statusStatLabels,
} from "~/features/game/catalog";
import type { TemplateOverride } from "~/features/game/templateVariants";
import type { VariantSet, VariantSetValue } from "~/features/game/variantSets";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import DurationInput from "./DurationInput";

type FieldConfig = {
  name: string;
  options?: Record<string, string>;
  min?: number;
  max?: number;
  step?: number;
};
export const variantSetFields: Record<TemplateOverride, FieldConfig> = {
  target_count: {
    name: "対象数",
    options: {
      "1": "単体（1体）",
      "3": "範囲（3体）",
      "5": "広域（5体）",
      all: "全体",
    },
  },
  multiplier: { name: "効果：攻撃倍率", min: 0, max: 10, step: 0.01 },
  amount: { name: "効果・状態の値", min: 0, max: 10000, step: 1 },
  amount_mode: {
    name: "値の指定",
    options: { fixed: "定数", percent: "比率（%）" },
  },
  duration_turns: { name: "持続数", min: 1, max: 20, step: 1 },
  stack_limit: { name: "重複上限", min: 1, max: 10, step: 1 },
  damage_type: {
    name: "計算系統",
    options: { physical: "物理", special: "特殊" },
  },
  effect: {
    name: "効果種別",
    options: {
      attack: "HPダメージ",
      heal_hp: "HP回復",
      damage_mp: "MPダメージ",
      heal_mp: "MP回復",
      buff: "バフ",
      debuff: "デバフ",
      ailment: "状態異常",
      recover_moves: "歩数回復",
    },
  },
  stat: { name: "状態の対象ステータス", options: statusStatLabels },
  ailment: {
    name: "状態異常",
    options: {
      poison: "毒",
      curse: "呪い",
      regen: "HP継続回復",
      refresh: "MP継続回復",
    },
  },
  affected_element: { name: "補正対象属性" },
  on_wrong: { name: "誤答時の効果" },
};

const selectClass = "h-9 min-w-0 rounded-md border bg-background px-2 text-sm";
const identity = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
function initialValue(field: TemplateOverride): VariantSetValue["value"] {
  const config = variantSetFields[field];
  if (field === "on_wrong") return { type: "fizzle" };
  if (config.options) return Object.keys(config.options)[0];
  return config.min ?? "";
}

export default function VariantSetEditor({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (next: GameCatalog) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VariantSet[]>([]);
  const [error, setError] = useState<string>();
  function update(id: string, patch: Partial<VariantSet>) {
    setDraft((rows) => rows.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function commit() {
    try {
      const sets = draft.map((set) => {
        if (!set.name.trim() || set.values.some((v) => !v.name.trim()))
          throw new Error("セット名とサブ名を入力してください。");
        const config = variantSetFields[set.field];
        return {
          ...set,
          values: set.values.map((v) => {
            const numeric =
              !(set.field === "duration_turns" && v.value === "infinite") &&
              (config.min !== undefined ||
                (set.field === "target_count" && v.value !== "all"));
            const value = numeric ? Number(v.value) : v.value;
            if (
              numeric &&
              (v.value === "" ||
                !Number.isFinite(value) ||
                Number(value) < (config.min ?? 1) ||
                Number(value) > (config.max ?? 5) ||
                (config.step === 1 && !Number.isInteger(value)))
            )
              throw new Error(`${set.name}の値が範囲外です。`);
            return { ...v, value };
          }),
        };
      });
      onChange(resolveCatalogTemplates({ ...catalog, variant_sets: sets }));
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "セットを反映できませんでした。",
      );
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(structuredClone(catalog.variant_sets ?? []));
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          変型セットを管理
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"
        data-dashboard-swipe-ignore
      >
        <DialogHeader>
          <DialogTitle>変型セット</DialogTitle>
          <DialogDescription>
            一つの項目の候補を共有します。反映後、一覧の保存で確定します。
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {draft.map((set) => {
          const config = variantSetFields[set.field];
          const options =
            set.field === "affected_element"
              ? Object.fromEntries(
                  (catalog.elements ?? []).map((e) => [e.id, e.name]),
                )
              : config.options;
          function valuePatch(id: string, value: Partial<VariantSetValue>) {
            update(set.id, {
              values: set.values.map((v) =>
                v.id === id ? { ...v, ...value } : v,
              ),
            });
          }
          return (
            <fieldset
              key={set.id}
              aria-label={set.name}
              className="min-w-0 space-y-2 rounded-md border p-3"
            >
              <div className="flex flex-wrap items-end gap-2">
                <label
                  htmlFor={`set-name-${set.id}`}
                  className="min-w-0 flex-1 space-y-1"
                >
                  <span className="text-xs">セット名</span>
                  <Input
                    id={`set-name-${set.id}`}
                    aria-label="セット名"
                    value={set.name}
                    maxLength={80}
                    onChange={(e) => update(set.id, { name: e.target.value })}
                  />
                </label>
                <label className="min-w-0 flex-1 space-y-1">
                  <span className="text-xs">変更する項目</span>
                  <select
                    aria-label="セットの変更項目"
                    className={`${selectClass} w-full`}
                    value={set.field}
                    onChange={(e) => {
                      const field = e.target.value as TemplateOverride;
                      update(set.id, {
                        field,
                        values: set.values.map((v) => ({
                          ...v,
                          value: initialValue(field),
                        })),
                      });
                    }}
                  >
                    {Object.entries(variantSetFields).map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="セットを削除"
                  onClick={() => setDraft(draft.filter((s) => s.id !== set.id))}
                >
                  <X className="size-4" />
                </Button>
              </div>
              {set.values.map((v) => (
                <div
                  key={v.id}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
                >
                  <Input
                    aria-label="セットのサブ名"
                    value={v.name}
                    maxLength={60}
                    onChange={(e) => valuePatch(v.id, { name: e.target.value })}
                  />
                  {set.field === "on_wrong" ? (
                    <div className="space-y-1">
                      <select
                        aria-label="誤答タイプ"
                        className={`${selectClass} w-full`}
                        value={
                          typeof v.value === "object"
                            ? String(v.value.type)
                            : "fizzle"
                        }
                        onChange={(e) =>
                          valuePatch(v.id, {
                            value:
                              e.target.value === "reduced"
                                ? { type: "reduced", amount: 0 }
                                : { type: e.target.value },
                          })
                        }
                      >
                        <option value="fizzle">不発</option>
                        <option value="counter">反撃</option>
                        <option value="reduced">軽減</option>
                      </select>
                      {typeof v.value === "object" &&
                        v.value.type === "reduced" && (
                          <Input
                            aria-label="軽減効果の値"
                            type="number"
                            min={0}
                            max={10000}
                            value={Number(v.value.amount ?? 0)}
                            onChange={(e) =>
                              valuePatch(v.id, {
                                value: {
                                  ...(v.value as object),
                                  amount: Number(e.target.value),
                                },
                              })
                            }
                          />
                        )}
                    </div>
                  ) : set.field === "duration_turns" ? (
                    <DurationInput
                      label="セットの値"
                      value={
                        v.value === "infinite" ? "infinite" : Number(v.value)
                      }
                      onChange={(value) => valuePatch(v.id, { value })}
                    />
                  ) : options ? (
                    <select
                      aria-label="セットの値"
                      className={selectClass}
                      value={String(v.value)}
                      onChange={(e) =>
                        valuePatch(v.id, { value: e.target.value })
                      }
                    >
                      {Object.entries(options).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      aria-label="セットの値"
                      type="number"
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={String(v.value)}
                      onChange={(e) =>
                        valuePatch(v.id, { value: e.target.value })
                      }
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="セットの候補を削除"
                    onClick={() =>
                      update(set.id, {
                        values: set.values.filter((item) => item.id !== v.id),
                      })
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                disabled={set.values.length >= 40}
                onClick={() =>
                  update(set.id, {
                    values: [
                      ...set.values,
                      {
                        id: identity("choice"),
                        name: `候補${set.values.length + 1}`,
                        value: initialValue(set.field),
                      },
                    ],
                  })
                }
              >
                ＋ 候補を追加
              </Button>
            </fieldset>
          );
        })}
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={draft.length >= 100}
            onClick={() =>
              setDraft([
                ...draft,
                {
                  id: identity("set"),
                  name: "新しいセット",
                  field: "target_count",
                  values: [],
                },
              ])
            }
          >
            ＋ セットを追加
          </Button>
          <Button type="button" onClick={commit}>
            セットを反映
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
