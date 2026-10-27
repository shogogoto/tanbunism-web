import { useState } from "react";
import type { GameCatalog, TriggerVariantSet } from "~/features/game/catalog";
import { resolveTriggerVariantSets } from "~/features/game/triggerVariants";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { TriggerVariantFieldsEditor } from "./TriggerVariantPanel";

export default function TriggerVariantSetEditor({
  catalog,
  stateSkills,
  onChange,
}: {
  catalog: GameCatalog;
  stateSkills: { id: string; name: string }[];
  onChange: (catalog: GameCatalog) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TriggerVariantSet[]>([]);
  const [error, setError] = useState<string>();
  const update = (id: string, patch: Partial<TriggerVariantSet>) =>
    setDraft((sets) => sets.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(structuredClone(catalog.trigger_variant_sets ?? []));
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          変型セットを管理
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>ガンビットの変型セット</DialogTitle>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {draft.map((set) => {
          const used = catalog.triggers?.some(
            (t) => t.variant_set_id === set.id,
          );
          return (
            <section
              key={set.id}
              aria-label={set.name}
              className="min-w-0 space-y-3 rounded-lg border p-3"
            >
              <div className="flex gap-2">
                <Input
                  aria-label="セット名"
                  maxLength={80}
                  value={set.name}
                  onChange={(e) => update(set.id, { name: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={used}
                  title={used ? "使用中のセットは削除できません" : "削除"}
                  aria-label={`${set.name}を削除`}
                  onClick={() => setDraft(draft.filter((s) => s.id !== set.id))}
                >
                  ×
                </Button>
              </div>
              <TriggerVariantFieldsEditor
                trigger={{
                  id: set.id,
                  name: set.name,
                  enabled: true,
                  condition: "hp_below",
                  threshold: 30,
                  variant_field: set.field,
                  variants: set.values,
                }}
                stateSkills={stateSkills}
                onChange={(patch) =>
                  update(set.id, {
                    ...(patch.variant_field
                      ? { field: patch.variant_field }
                      : {}),
                    ...(patch.variants ? { values: patch.variants } : {}),
                  })
                }
              />
            </section>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={draft.length >= 100}
          onClick={() =>
            setDraft([
              ...draft,
              {
                id: `set_${crypto.randomUUID().replaceAll("-", "")}`,
                name: "新しいセット",
                field: "threshold",
                values: [],
              },
            ])
          }
        >
          セットを追加
        </Button>
        <Button
          type="button"
          onClick={() => {
            try {
              onChange(
                resolveTriggerVariantSets({
                  ...catalog,
                  trigger_variant_sets: draft,
                }),
              );
              setOpen(false);
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "セットを反映できませんでした。",
              );
            }
          }}
        >
          反映
        </Button>
      </DialogContent>
    </Dialog>
  );
}
