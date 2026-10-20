import { useState } from "react";
import {
  type GameCatalog,
  type SkillDefinition,
  normalizeSkill,
  skillTemplate,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import SkillTables from "./SkillTables";

export default function SkillTemplateEditor({
  catalog,
  onChange,
}: {
  catalog: GameCatalog;
  onChange: (catalog: GameCatalog) => void;
}) {
  const [open, setOpen] = useState(false);
  const templates = catalog.skill_templates ?? [];
  const usage = Object.fromEntries(
    templates.map((t) => [
      t.id,
      catalog.skills.filter((s) => s.template_id === t.id).map((s) => s.name),
    ]),
  );
  const rows = templates.map((t) =>
    normalizeSkill({ ...t, icon: "sparkles", enabled: true }),
  );
  return (
    <section
      aria-label="効果テンプレート"
      className="space-y-3 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          効果テンプレート · {templates.length}件
        </h3>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "テンプレートを閉じる" : "効果テンプレートを編集"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        変更は使用中の全スキルに反映されます。名前・属性・演出はスキルごとに設定します。保存するまで確定しません。
      </p>
      {open && (
        <SkillTables
          skills={rows}
          templateMode
          templateUsage={usage}
          deletions={new Set()}
          update={(id, patch) =>
            onChange({
              ...catalog,
              skill_templates: rows.map((s) =>
                skillTemplate(
                  s.id === id ? normalizeSkill({ ...s, ...patch }) : s,
                ),
              ),
            })
          }
          toggleDelete={(id) =>
            onChange({
              ...catalog,
              skill_templates: templates.filter((t) => t.id !== id),
            })
          }
          add={(effect: SkillDefinition["effect"], damage_type) => {
            const template = skillTemplate(
              normalizeSkill({
                id: `template_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
                name: "新しいテンプレート",
                icon: "sparkles",
                enabled: true,
                effect,
                damage_type,
                target: ["attack", "debuff", "ailment"].includes(effect)
                  ? "enemy"
                  : "self",
                amount: effect === "ailment" ? 5 : 0,
                mp_cost: 0,
              }),
            );
            onChange({ ...catalog, skill_templates: [...templates, template] });
          }}
        />
      )}
    </section>
  );
}
