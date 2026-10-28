import {
  type GameCatalog,
  resolveCatalogTemplates,
  statusStatLabels,
} from "~/features/game/catalog";
import type { TemplateOverride } from "~/features/game/templateVariants";
import type { VariantSetValue } from "~/features/game/variantSets";
import { Input } from "~/shared/components/ui/input";
import DurationInput from "./DurationInput";
import VariantSetManager from "./VariantSetManager";

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
export default function VariantSetEditor({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (next: GameCatalog) => void }) {
  const initialValue = (field: TemplateOverride): VariantSetValue["value"] => {
    const config = variantSetFields[field];
    if (field === "on_wrong") return { type: "fizzle" };
    if (field === "affected_element") return catalog.elements?.[0]?.id ?? "";
    return config.options ? Object.keys(config.options)[0] : (config.min ?? "");
  };
  return (
    <VariantSetManager
      sets={catalog.variant_sets ?? []}
      fields={variantSetFields}
      defaultField="target_count"
      initialValue={initialValue}
      renderValue={(field, value, onValue) => {
        const config = variantSetFields[field];
        const options =
          field === "affected_element"
            ? Object.fromEntries(
                (catalog.elements ?? []).map((e) => [e.id, e.name]),
              )
            : config.options;
        if (field === "on_wrong")
          return (
            <div className="space-y-1">
              <select
                aria-label="誤答タイプ"
                className={selectClass}
                value={
                  typeof value === "object" ? String(value.type) : "fizzle"
                }
                onChange={(e) =>
                  onValue(
                    e.target.value === "reduced"
                      ? { type: "reduced", amount: 0 }
                      : { type: e.target.value },
                  )
                }
              >
                <option value="fizzle">不発</option>
                <option value="counter">反撃</option>
                <option value="reduced">軽減</option>
              </select>
              {typeof value === "object" && value.type === "reduced" && (
                <Input
                  aria-label="軽減効果の値"
                  type="number"
                  min={0}
                  max={10000}
                  value={Number(value.amount ?? 0)}
                  onChange={(e) =>
                    onValue({ ...value, amount: Number(e.target.value) })
                  }
                />
              )}
            </div>
          );
        if (field === "duration_turns")
          return (
            <DurationInput
              label="セットの値"
              value={value === "infinite" ? "infinite" : Number(value)}
              onChange={onValue}
            />
          );
        return options ? (
          <select
            aria-label="セットの値"
            className={selectClass}
            value={String(value)}
            onChange={(e) => onValue(e.target.value)}
          >
            {Object.entries(options).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
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
            value={String(value)}
            onChange={(e) => onValue(e.target.value)}
          />
        );
      }}
      onCommit={(draft) => {
        const sets = draft.map((set) => ({
          ...set,
          values: set.values.map((v) => {
            const config = variantSetFields[set.field];
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
        }));
        onChange(resolveCatalogTemplates({ ...catalog, variant_sets: sets }));
      }}
    />
  );
}
