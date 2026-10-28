import { X } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { SharedVariantSet } from "~/features/game/variantCore";
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

export const variantIdentity = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;

export default function VariantSetManager<F extends string, V>({
  sets,
  fields,
  defaultField,
  initialValue,
  renderValue,
  onCommit,
  title = "変型セット",
  canRemove,
}: {
  sets: SharedVariantSet<F, V>[];
  fields: Record<F, { name: string }>;
  defaultField: F;
  initialValue: (field: F) => V;
  renderValue: (field: F, value: V, onChange: (value: V) => void) => ReactNode;
  onCommit: (sets: SharedVariantSet<F, V>[]) => void;
  title?: string;
  canRemove?: (id: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SharedVariantSet<F, V>[]>([]);
  const [error, setError] = useState<string>();
  const update = (id: string, patch: Partial<SharedVariantSet<F, V>>) =>
    setDraft((rows) => rows.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(structuredClone(sets));
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            一つの項目の候補を共有します。反映後、一覧の保存で確定します。
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {draft.map((set) => (
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
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={set.field}
                  onChange={(e) => {
                    const field = e.target.value as F;
                    update(set.id, {
                      field,
                      values: set.values.map((v) => ({
                        ...v,
                        value: initialValue(field),
                      })),
                    });
                  }}
                >
                  {Object.entries<{ name: string }>(fields).map(
                    ([id, config]) => (
                      <option key={id} value={id}>
                        {config.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="セットを削除"
                disabled={canRemove && !canRemove(set.id)}
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
                  onChange={(e) =>
                    update(set.id, {
                      values: set.values.map((c) =>
                        c.id === v.id ? { ...c, name: e.target.value } : c,
                      ),
                    })
                  }
                />
                {renderValue(set.field, v.value, (value) =>
                  update(set.id, {
                    values: set.values.map((c) =>
                      c.id === v.id ? { ...c, value } : c,
                    ),
                  }),
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="セットの候補を削除"
                  onClick={() =>
                    update(set.id, {
                      values: set.values.filter((c) => c.id !== v.id),
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
                      id: variantIdentity("choice"),
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
        ))}
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={draft.length >= 100}
            onClick={() =>
              setDraft([
                ...draft,
                {
                  id: variantIdentity("set"),
                  name: "新しいセット",
                  field: defaultField,
                  values: [],
                },
              ])
            }
          >
            ＋ セットを追加
          </Button>
          <Button
            type="button"
            onClick={() => {
              try {
                if (
                  draft.some(
                    (s) =>
                      !s.name.trim() || s.values.some((v) => !v.name.trim()),
                  )
                )
                  throw new Error("セット名とサブ名を入力してください。");
                onCommit(draft);
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
            セットを反映
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
