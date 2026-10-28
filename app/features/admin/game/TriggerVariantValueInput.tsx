import type {
  TriggerDefinition,
  TriggerVariantField,
} from "~/features/game/catalog";
import { statCondition } from "~/features/game/triggerConditions";
import {
  triggerBasisLabels,
  triggerComparisonLabels,
  triggerConditionLabels,
  triggerStatLabels,
  triggerTargets,
  triggerThresholdBounds,
} from "~/features/game/triggerVariants";
import { Input } from "~/shared/components/ui/input";

export function triggerFieldOptions(
  field: TriggerVariantField,
  skills: { id: string; name: string }[],
) {
  const choices = {
    target: triggerTargets,
    condition: triggerConditionLabels,
    stat: triggerStatLabels,
    stat_basis: triggerBasisLabels,
    comparison: triggerComparisonLabels,
    state_present: { true: "あり", false: "なし" },
    state_skill_id: Object.fromEntries(skills.map((s) => [s.id, s.name])),
    threshold: {},
  };
  return choices[field];
}
export function initialTriggerValue(
  field: TriggerVariantField,
  skills: { id: string; name: string }[],
): string | number | boolean {
  if (field === "threshold") return 30;
  if (field === "state_present") return true;
  return Object.keys(triggerFieldOptions(field, skills))[0] ?? "";
}

export function currentTriggerValue(
  trigger: TriggerDefinition,
  field: TriggerVariantField,
  skills: { id: string; name: string }[],
): string | number | boolean {
  const value =
    field === "stat" || field === "stat_basis" || field === "comparison"
      ? statCondition(trigger)[field]
      : trigger[field];
  return value ?? initialTriggerValue(field, skills);
}
export default function TriggerVariantValueInput({
  field,
  value,
  onChange,
  skills,
  label = "変型の値",
  trigger,
}: {
  field: TriggerVariantField;
  value: unknown;
  onChange: (value: string | number | boolean) => void;
  skills: { id: string; name: string }[];
  label?: string;
  trigger?: TriggerDefinition;
}) {
  const options = triggerFieldOptions(field, skills);
  return field === "threshold" ? (
    <Input
      aria-label={label}
      type="number"
      {...(trigger ? triggerThresholdBounds(trigger) : { min: 0, max: 100000 })}
      step={1}
      value={Number.isFinite(Number(value)) ? Number(value) : ""}
      onChange={(e) => onChange(e.target.valueAsNumber)}
    />
  ) : (
    <select
      aria-label={label}
      className="h-9 min-w-0 rounded-md border bg-background px-2"
      value={String(value)}
      onChange={(e) =>
        onChange(
          field === "state_present"
            ? e.target.value === "true"
            : e.target.value,
        )
      }
    >
      {!(String(value) in options) && (
        <option value={String(value)}>利用不可</option>
      )}
      {Object.entries(options).map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
}
