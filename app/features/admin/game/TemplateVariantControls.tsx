import type { ReactNode } from "react";
import type { GameCatalog, SkillTemplate } from "~/features/game/catalog";
import { resolveCatalogTemplates } from "~/features/game/catalog";
import { templateDifferences } from "~/features/game/templateVariants";
import TemplateVariantPanel from "./TemplateVariantPanel";

export default function TemplateVariantControls({
  template,
  catalog,
  onChange,
  locked = false,
  renderVariant,
}: {
  template: SkillTemplate;
  catalog: GameCatalog;
  onChange: (catalog: GameCatalog) => void;
  locked?: boolean;
  renderVariant?: (id: string) => ReactNode;
}) {
  const templates = catalog.skill_templates ?? [];
  const children = templates.filter(
    (row) => row.base_template_id === template.id,
  );
  const bases = templates.filter(
    (row) => !row.base_template_id && row.id !== template.id,
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
                      override_fields: templateDifferences(
                        templates.find((item) => item.id === base) ?? row,
                        row,
                      ),
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
      {!template.base_template_id && renderVariant && (
        <TemplateVariantPanel
          template={template}
          catalog={catalog}
          onChange={onChange}
          renderVariant={renderVariant}
        />
      )}
    </div>
  );
}
