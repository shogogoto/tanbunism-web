import type {
  TriggerDefinition,
  TriggerVariantField,
  TriggerVariantSet,
} from "~/features/game/catalog";
import {
  triggerConditionLabels,
  triggerTargets,
  triggerVariantFields,
} from "~/features/game/triggerVariants";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";

export default function TriggerVariantPanel({
  trigger,
  stateSkills,
  onChange,
  onOpenChange,
  sets = [],
  onCreateSet,
}: {
  trigger: TriggerDefinition;
  stateSkills: { id: string; name: string }[];
  onChange: (patch: Partial<TriggerDefinition>) => void;
  onOpenChange: (open: boolean) => void;
  sets?: TriggerVariantSet[];
  onCreateSet?: () => void;
}) {
  const shared = sets.find((s) => s.id === trigger.variant_set_id);
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          変型{trigger.variants?.length ? ` ${trigger.variants.length}` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle>{trigger.name}の変型</DialogTitle>
        <label className="grid gap-1 text-sm">
          変型セット
          <select
            className="h-9 rounded-md border bg-background px-2"
            value={trigger.variant_set_id ?? ""}
            onChange={(e) =>
              onChange({ variant_set_id: e.target.value || null })
            }
          >
            <option value="">個別設定</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset disabled={!!shared} className="min-w-0 space-y-3">
          <TriggerVariantFieldsEditor
            trigger={trigger}
            stateSkills={stateSkills}
            onChange={onChange}
          />
        </fieldset>
        {!shared && onCreateSet && (
          <Button
            type="button"
            variant="outline"
            disabled={sets.length >= 100}
            onClick={onCreateSet}
          >
            セットとして登録
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TriggerVariantFieldsEditor({
  trigger,
  stateSkills,
  onChange,
}: {
  trigger: TriggerDefinition;
  stateSkills: { id: string; name: string }[];
  onChange: (patch: Partial<TriggerDefinition>) => void;
}) {
  const field = trigger.variant_field ?? "threshold";
  const variants = trigger.variants ?? [];
  const options =
    field === "target"
      ? Object.entries(triggerTargets)
      : field === "condition"
        ? Object.entries(triggerConditionLabels)
        : field === "state_present"
          ? [
              ["true", "あり"],
              ["false", "なし"],
            ]
          : field === "state_skill_id"
            ? stateSkills.map((s) => [s.id, s.name])
            : [];
  const update = (id: string, patch: object) =>
    onChange({
      variants: variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  return (
    <>
      <label className="grid gap-1 text-sm">
        変更する項目
        <select
          className="h-9 rounded-md border bg-background px-2"
          value={field}
          onChange={(e) =>
            onChange({
              variant_field: e.target.value as TriggerVariantField,
              variants: [],
            })
          }
        >
          {Object.entries(triggerVariantFields).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {variants.map((variant) => (
        <div key={variant.id} className="flex min-w-0 gap-2">
          <Input
            aria-label="変型の副名"
            className="min-w-0 flex-1"
            maxLength={60}
            value={variant.name}
            onChange={(e) => update(variant.id, { name: e.target.value })}
          />
          {field === "threshold" ? (
            <Input
              aria-label="変型の値"
              className="w-24"
              type="number"
              min={1}
              max={100}
              value={
                Number.isFinite(Number(variant.value))
                  ? Number(variant.value)
                  : ""
              }
              onChange={(e) =>
                update(variant.id, { value: e.target.valueAsNumber })
              }
            />
          ) : (
            <select
              aria-label="変型の値"
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2"
              value={String(variant.value)}
              onChange={(e) =>
                update(variant.id, {
                  value:
                    field === "state_present"
                      ? e.target.value === "true"
                      : e.target.value,
                })
              }
            >
              {!options.some(([key]) => key === String(variant.value)) && (
                <option value={String(variant.value)}>利用不可</option>
              )}
              {options.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <Button
            type="button"
            variant="ghost"
            aria-label={`${variant.name}を削除`}
            onClick={() =>
              onChange({
                variants: variants.filter((v) => v.id !== variant.id),
              })
            }
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={
          variants.length >= 40 ||
          (field === "state_skill_id" && !options.length)
        }
        onClick={() =>
          onChange({
            variants: [
              ...variants,
              {
                id: `variant_${crypto.randomUUID().replaceAll("-", "")}`,
                name: "新しい変型",
                value:
                  field === "threshold"
                    ? trigger.threshold
                    : field === "state_present"
                      ? true
                      : (options[0]?.[0] ?? ""),
              },
            ],
          })
        }
      >
        変型を追加
      </Button>
    </>
  );
}
