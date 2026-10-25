import { useState } from "react";
import type { SkillTemplate } from "~/features/game/catalog";
import {
  type VariantSelection,
  type VariantSet,
  attachedVariantSets,
} from "~/features/game/variantSets";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";

export default function VariantCombinationPicker({
  template,
  base,
  sets,
  disabled,
  label,
  onChoose,
}: {
  template: SkillTemplate;
  base: SkillTemplate;
  sets: VariantSet[];
  disabled: boolean;
  label: string;
  onChoose: (baseId: string, selections: VariantSelection[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<VariantSelection[]>([]);
  const [error, setError] = useState<string>();
  const attached = attachedVariantSets(base, sets);
  if (!attached.length) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
        if (next) setSelected(template.variant_selections ?? []);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-xs"
          aria-label={label}
          disabled={disabled}
        >
          変型
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-md"
        data-dashboard-swipe-ignore
      >
        <DialogHeader>
          <DialogTitle>{base.name}の組み合わせ</DialogTitle>
          <DialogDescription>
            各セットから候補を選びます。共通値のまま使うこともできます。
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {attached.map((set) => (
          <label key={set.id} className="space-y-1">
            <span className="text-sm">{set.name}</span>
            <select
              aria-label={set.name}
              className="h-9 w-full rounded-md border bg-background px-2"
              value={selected.find((s) => s.set_id === set.id)?.value_id ?? ""}
              onChange={(e) =>
                setSelected([
                  ...selected.filter((s) => s.set_id !== set.id),
                  ...(e.target.value
                    ? [{ set_id: set.id, value_id: e.target.value }]
                    : []),
                ])
              }
            >
              <option value="">共通値</option>
              {set.values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <Button
          type="button"
          onClick={() => {
            try {
              onChoose(base.id, selected);
              setOpen(false);
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "組み合わせを変更できませんでした。",
              );
            }
          }}
        >
          この組み合わせを使う
        </Button>
      </DialogContent>
    </Dialog>
  );
}
