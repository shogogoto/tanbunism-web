import type { GameCatalog, SkillTemplate } from "~/features/game/catalog";
import { resolveCatalogTemplates } from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";

export default function TemplateVariantControls({
  template,
  catalog,
  onChange,
  locked = false,
}: {
  template: SkillTemplate;
  catalog: GameCatalog;
  onChange: (catalog: GameCatalog) => void;
  locked?: boolean;
}) {
  const templates = catalog.skill_templates ?? [];
  const children = templates.filter(
    (row) => row.base_template_id === template.id,
  );
  const bases = templates.filter(
    (row) =>
      !row.base_template_id &&
      row.id !== template.id &&
      row.effect === template.effect,
  );
  function change(next: SkillTemplate[]) {
    onChange(resolveCatalogTemplates({ ...catalog, skill_templates: next }));
  }
  return (
    <div className="mt-1 grid gap-1 text-xs">
      <select
        aria-label="共通設定"
        className="h-8 w-44 rounded-md border bg-background px-1"
        value={template.base_template_id ?? ""}
        disabled={locked || children.length > 0}
        onChange={(e) => {
          const base = e.target.value;
          change(
            templates.map((row) =>
              row.id !== template.id
                ? row
                : base
                  ? {
                      ...row,
                      base_template_id: base,
                      override_fields: ["target_count"],
                    }
                  : {
                      ...row,
                      base_template_id: undefined,
                      override_fields: undefined,
                    },
            ),
          );
        }}
      >
        <option value="">独立した共通設定</option>
        {bases.map((base) => (
          <option key={base.id} value={base.id}>
            {base.name}
          </option>
        ))}
      </select>
      {!template.base_template_id && (
        <>
          {children.length > 0 && (
            <span className="text-muted-foreground">
              バリエーション {children.length}件
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 justify-start px-1 text-xs"
            onClick={() => {
              const missing = ([1, 3, 5, "all"] as const).filter(
                (count) => !children.some((row) => row.target_count === count),
              );
              const variants = missing.map((count) => ({
                ...template,
                id: `variant_${crypto.randomUUID().replaceAll("-", "")}`,
                name: `${template.name.slice(0, 72)}（${count === "all" ? "全体" : `${count}体`}）`,
                base_template_id: template.id,
                override_fields: ["target_count"] as const,
                target_count: count,
              }));
              change([
                ...templates,
                ...variants.map((row) => ({
                  ...row,
                  override_fields: [...row.override_fields],
                })),
              ]);
            }}
          >
            対象数別に作成
          </Button>
        </>
      )}
    </div>
  );
}
