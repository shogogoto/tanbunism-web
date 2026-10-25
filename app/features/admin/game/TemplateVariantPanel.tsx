import { X } from "lucide-react";
import { useState } from "react";
import {
  type GameCatalog,
  type SkillTemplate,
  defaultElements,
  resolveCatalogTemplates,
} from "~/features/game/catalog";
import {
  MAX_VARIANT_DEPTH,
  templateLineage,
  variantName,
} from "~/features/game/templateVariants";
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
import { Label } from "~/shared/components/ui/label";
import VariantSetEditor, { variantSetFields } from "./VariantSetEditor";
import {
  type VariantAxis,
  axisVariant,
  templateSkill,
  variantAxes,
} from "./templateVariantAxes";
import { variantRowHighlight } from "./variantRowStyles";

export default function TemplateVariantPanel({
  template,
  catalog,
  onChange,
}: {
  template: SkillTemplate;
  catalog: GameCatalog;
  onChange: (catalog: GameCatalog) => void;
}) {
  const [pendingAxis, setPendingAxis] = useState<string>();
  const [error, setError] = useState<string>();
  const templates = catalog.skill_templates ?? [];
  const variants = templates.filter(
    (row) =>
      row.base_template_id === template.id && !row.variant_selections?.length,
  );
  const axes = variantAxes(template, catalog.elements ?? defaultElements);
  const depth = templateLineage(templates, template.id).length - 1;
  const axis = axes.find((item) => item.id === template.variant_axis);
  const labelOf = (row: SkillTemplate) =>
    row.variant_label ??
    (row.name.startsWith(`${template.name}（`) && row.name.endsWith("）")
      ? row.name.slice(template.name.length + 1, -1)
      : row.name);
  const named = (row: SkillTemplate, label: string) => ({
    ...row,
    variant_label: label,
    name: variantName(templates, template.id, label),
  });
  function change(next: SkillTemplate[]) {
    try {
      onChange(resolveCatalogTemplates({ ...catalog, skill_templates: next }));
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "変型を更新できませんでした。",
      );
    }
  }
  function choose(nextAxis: VariantAxis) {
    change(
      templates.map((row) =>
        row.id === template.id
          ? { ...row, variant_axis: nextAxis.id }
          : row.base_template_id === template.id &&
              !row.variant_selections?.length
            ? axisVariant(
                template,
                nextAxis,
                String(nextAxis.read(templateSkill(template))),
                named(row, labelOf(row)),
              )
            : row,
      ),
    );
    setPendingAxis(undefined);
  }
  function remove(row: SkillTemplate) {
    if (templates.some((item) => item.base_template_id === row.id)) {
      setError("下位の変型があるため削除できません。");
      return;
    }
    if (
      catalog.skills.some(
        (skill) =>
          skill.template_ids?.includes(row.id) || skill.template_id === row.id,
      )
    ) {
      setError("スキルで使用中の変型は削除できません。");
      return;
    }
    change(templates.filter((item) => item.id !== row.id));
  }
  return (
    <Dialog
      onOpenChange={() => {
        setError(undefined);
        setPendingAxis(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-xs"
          data-variant-trigger
        >
          変型{variants.length ? ` ${variants.length}` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
        data-dashboard-swipe-ignore
      >
        <DialogHeader>
          <DialogTitle className="break-words">
            {template.name}の変型
          </DialogTitle>
          <DialogDescription className="sr-only">
            変更項目を1つ選び、サブ名と値を登録します。一覧の保存で確定します。
          </DialogDescription>
        </DialogHeader>
        <fieldset className="min-w-0 space-y-2" aria-label="使用する変型セット">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">共有する変型セット</span>
            <VariantSetEditor catalog={catalog} onChange={onChange} />
          </div>
          {(catalog.variant_sets ?? []).map((set) => {
            const ids = template.variant_set_ids ?? [];
            const checked = ids.includes(set.id);
            const conflict =
              !checked &&
              (catalog.variant_sets ?? []).some(
                (other) => ids.includes(other.id) && other.field === set.field,
              );
            const incompatible = !(set.field in template);
            return (
              <label key={set.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={`${set.name}を使用`}
                  checked={checked}
                  disabled={conflict || incompatible}
                  onChange={(e) => {
                    try {
                      onChange(
                        resolveCatalogTemplates({
                          ...catalog,
                          skill_templates: templates.map((row) =>
                            row.id === template.id
                              ? {
                                  ...row,
                                  variant_set_ids: e.target.checked
                                    ? [...ids, set.id]
                                    : ids.filter((id) => id !== set.id),
                                }
                              : row,
                          ),
                        }),
                      );
                      setError(undefined);
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "セットを変更できませんでした。",
                      );
                    }
                  }}
                />
                <span>{set.name}</span>
                <span className="text-xs text-muted-foreground">
                  {variantSetFields[set.field].name}
                  {conflict
                    ? "（同じ項目を使用中）"
                    : incompatible
                      ? "（この効果では使用不可）"
                      : ""}
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="border-t pt-3 text-sm font-medium">個別の変型</div>
        <div className="space-y-2">
          <Label htmlFor={`variant-axis-${template.id}`}>変更する項目</Label>
          <select
            id={`variant-axis-${template.id}`}
            className="h-9 w-full rounded-md border bg-background px-2"
            value={axis?.id ?? ""}
            onChange={(event) => {
              const next = axes.find((item) => item.id === event.target.value);
              if (!next) return;
              if (variants.length) setPendingAxis(next.id);
              else choose(next);
            }}
          >
            <option value="" disabled>
              項目を選択
            </option>
            {axes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {pendingAxis && (
          <div role="alert" className="space-y-2 rounded-md border p-3 text-sm">
            <p>
              変更項目を切り替えると、登録済みの値は共通値に戻ります。サブ名とスキルからの参照は維持します。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  const next = axes.find((item) => item.id === pendingAxis);
                  if (next) choose(next);
                }}
              >
                この項目に切り替える
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingAxis(undefined)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
        {!axis && variants.length > 0 && (
          <p className="text-sm text-muted-foreground">
            既存の個別設定を保持しています。変更項目を選ぶと1項目の変型へ切り替えられます。
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <fieldset
          className="min-w-0 space-y-2"
          aria-label="変型の値一覧"
          disabled={Boolean(pendingAxis)}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_2rem] gap-2 text-xs text-muted-foreground">
            <span>サブ名</span>
            <span>{axis?.label ?? "値"}</span>
            <span>変型</span>
          </div>
          {variants.map((row) => (
            <fieldset
              key={row.id}
              className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_2rem] items-center gap-2 ${variantRowHighlight}`}
              aria-label={row.name}
            >
              <Input
                aria-label="サブ名"
                maxLength={60}
                value={labelOf(row)}
                onChange={(event) =>
                  change(
                    templates.map((item) =>
                      item.id === row.id
                        ? named(row, event.target.value)
                        : item,
                    ),
                  )
                }
              />
              {axis ? (
                axis.options ? (
                  <select
                    aria-label="変型の値"
                    className="h-9 min-w-0 rounded-md border bg-background px-2"
                    value={axis.read(templateSkill(row))}
                    onChange={(event) =>
                      change(
                        templates.map((item) =>
                          item.id === row.id
                            ? axisVariant(
                                template,
                                axis,
                                event.target.value,
                                row,
                              )
                            : item,
                        ),
                      )
                    }
                  >
                    {Object.entries(axis.options).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    aria-label="変型の値"
                    type="number"
                    min={axis.min}
                    max={axis.max}
                    step={axis.step}
                    value={axis.read(templateSkill(row))}
                    onChange={(event) =>
                      change(
                        templates.map((item) =>
                          item.id === row.id
                            ? axisVariant(
                                template,
                                axis,
                                event.target.value,
                                row,
                              )
                            : item,
                        ),
                      )
                    }
                  />
                )
              ) : (
                <span className="text-xs text-muted-foreground">個別設定</span>
              )}
              {depth + 1 < MAX_VARIANT_DEPTH ? (
                <TemplateVariantPanel
                  template={row}
                  catalog={catalog}
                  onChange={onChange}
                />
              ) : (
                <span className="text-xs text-muted-foreground">上限</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="変型を削除"
                onClick={() => remove(row)}
              >
                <X className="size-4" />
              </Button>
            </fieldset>
          ))}
        </fieldset>
        <Button
          type="button"
          variant="outline"
          disabled={!axis || Boolean(pendingAxis) || depth >= MAX_VARIANT_DEPTH}
          onClick={() => {
            if (!axis) return;
            const row = named(
              {
                ...template,
                id: `variant_${crypto.randomUUID().replaceAll("-", "")}`,
              },
              `変型${variants.length + 1}`,
            );
            change([
              ...templates,
              axisVariant(
                template,
                axis,
                String(axis.read(templateSkill(template))),
                row,
              ),
            ]);
          }}
        >
          ＋ 値を追加
        </Button>
      </DialogContent>
    </Dialog>
  );
}
