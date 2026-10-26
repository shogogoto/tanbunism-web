import { Plus, X } from "lucide-react";
import type { SkillTemplate } from "~/features/game/catalog";
import type { VariantSelection, VariantSet } from "~/features/game/variantSets";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import VariantCombinationPicker from "./VariantCombinationPicker";

export default function SkillTemplateBadges({
  value,
  templates,
  disabled,
  onChange,
  variantSets = [],
  onCombine,
  chances = {},
  onChanceChange,
}: {
  value: string[];
  templates: SkillTemplate[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
  chances?: Record<string, number>;
  onChanceChange?: (id: string, chance: number) => void;
  variantSets?: VariantSet[];
  onCombine?: (
    index: number,
    baseId: string,
    selections: VariantSelection[],
  ) => void;
}) {
  const available = templates.filter(
    (template) =>
      !value.includes(template.id) && !template.variant_selections?.length,
  );
  return (
    <fieldset
      aria-label="効果テンプレート"
      disabled={disabled}
      className="flex h-9 w-max min-w-0 max-w-lg items-center gap-1"
    >
      <div
        className="flex h-9 min-w-0 flex-nowrap items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-template-badges
      >
        {value.map((id, index) => {
          const template = templates.find((t) => t.id === id);
          const base = template?.variant_selections?.length
            ? templates.find((t) => t.id === template.base_template_id)
            : template;
          const name =
            templates.find((template) => template.id === id)?.name ?? id;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="h-7 gap-1 overflow-visible px-2 focus-within:ring-2 focus-within:ring-ring/50"
            >
              <span className="relative min-w-0">
                <span aria-hidden="true" className="block max-w-60 truncate">
                  {name}
                </span>
                <select
                  aria-label={`効果テンプレート ${index + 1}`}
                  title={name}
                  value={id}
                  className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
                  onChange={(event) =>
                    onChange(
                      value.map((current, position) =>
                        position === index ? event.target.value : current,
                      ),
                    )
                  }
                >
                  {templates
                    .filter(
                      (template) =>
                        template.id === id ||
                        (!value.includes(template.id) &&
                          !template.variant_selections?.length),
                    )
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
              </span>
              {onChanceChange && (
                <span className="flex shrink-0 items-center gap-0.5">
                  <Input
                    aria-label={`効果 ${index + 1}の発動率`}
                    title="発動率（%）"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    value={
                      Number.isFinite(chances[id] ?? 100)
                        ? (chances[id] ?? 100)
                        : ""
                    }
                    className="h-6 w-14 border-0 bg-transparent px-1 text-xs"
                    onChange={(e) => onChanceChange(id, e.target.valueAsNumber)}
                  />
                  <span>%</span>
                </span>
              )}
              {template && base && onCombine && (
                <VariantCombinationPicker
                  template={template}
                  base={base}
                  sets={variantSets}
                  disabled={disabled}
                  label={`効果 ${index + 1}の変型を選ぶ`}
                  onChoose={(baseId, selections) =>
                    onCombine(index, baseId, selections)
                  }
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-4 rounded-sm p-0"
                aria-label={`効果 ${index + 1}を外す`}
                title="効果を外す"
                disabled={value.length <= 1}
                onClick={() =>
                  onChange(value.filter((_, position) => position !== index))
                }
              >
                <X aria-hidden="true" className="size-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 shrink-0"
        aria-label="効果を追加"
        title="効果を追加"
        disabled={value.length >= 20 || !available.length}
        onClick={() => {
          const next = available[0];
          if (next) onChange([...value, next.id]);
        }}
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
    </fieldset>
  );
}
