import type { SharedVariantSet } from "~/features/game/variantCore";

export default function VariantSetPicker({
  sets,
  selected,
  inherited = [],
  labels,
  onChange,
  compatible = () => true,
}: {
  sets: SharedVariantSet[];
  selected: string[];
  inherited?: string[];
  labels: Record<string, string>;
  onChange: (ids: string[]) => void;
  compatible?: (set: SharedVariantSet) => boolean;
}) {
  return (
    <fieldset aria-label="使用する変型セット" className="min-w-0 space-y-2">
      {sets.map((set) => {
        const checked = selected.includes(set.id);
        const conflict =
          !checked &&
          sets.some(
            (other) => selected.includes(other.id) && other.field === set.field,
          );
        const incompatible = !compatible(set);
        return (
          <label key={set.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={`${set.name}を使用`}
              checked={checked}
              disabled={
                conflict ||
                incompatible ||
                inherited.includes(set.id) ||
                (!checked && selected.length >= 8)
              }
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, set.id]
                    : selected.filter((id) => id !== set.id),
                )
              }
            />
            <span>{set.name}</span>
            <span className="text-xs text-muted-foreground">
              {labels[set.field]}
              {inherited.includes(set.id)
                ? "（親から継承）"
                : conflict
                  ? "（同じ項目を使用中）"
                  : incompatible
                    ? "（この効果では使用不可）"
                    : ""}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
