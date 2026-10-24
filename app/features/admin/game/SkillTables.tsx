import { Plus, X } from "lucide-react";
import type {
  SkillDefinition,
  SkillPatch,
  SkillTemplate,
} from "~/features/game/catalog";
import {
  type ElementDefinition,
  defaultElements,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import RowOrder, { moveRow } from "./RowOrder";
import SkillAnimationGallery from "./SkillAnimationGallery";
import { SortableRow, SortableRows } from "./SortableRows";
import useTableSort from "./useTableSort";

export default function SkillTables({
  skills,
  templates = [],
  update,
  add,
  deletions,
  toggleDelete,
  reorder,
  elements = defaultElements,
}: {
  skills: SkillDefinition[];
  templates?: SkillTemplate[];
  update: (id: string, patch: SkillPatch) => void;
  add: (
    effect: SkillDefinition["effect"],
    damageType?: "physical" | "special",
  ) => void;
  deletions: Set<string>;
  toggleDelete: (id: string) => void;
  reorder: (skills: SkillDefinition[]) => void;
  elements?: ElementDefinition[];
}) {
  const names = (skill: SkillDefinition) =>
    (skill.template_ids ?? [])
      .map((id) => templates.find((t) => t.id === id)?.name ?? id)
      .join("、");
  const { sorted, header, resetSort } = useTableSort(skills, (skill, column) =>
    column === "order"
      ? skills.findIndex((row) => row.id === skill.id)
      : column === "templates"
        ? names(skill)
        : column === "element"
          ? (elements.find((element) => element.id === skill.element)?.name ??
            "無属性")
          : column === "mp_cost"
            ? skill.mp_cost
            : column === "enabled"
              ? Number(skill.enabled)
              : column === "deleted"
                ? Number(deletions.has(skill.id))
                : column === "animation"
                  ? (skill.animation ?? "none")
                  : skill.name,
  );
  return (
    <section aria-label="スキル一覧" className="space-y-2">
      <h3 className="font-semibold">スキル一覧</h3>
      <div className="overflow-x-auto rounded-lg border">
        <SortableRows
          rows={sorted}
          onReorder={(rows) => {
            reorder(rows);
            resetSort();
          }}
        >
          <table aria-label="スキル一覧" className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {[
                  ["order", "番号"],
                  ["name", "名前"],
                  ["templates", "効果テンプレート"],
                  ["element", "属性"],
                  ["mp_cost", "消費MP"],
                  ["animation", "演出"],
                  ["enabled", "有効"],
                  ["deleted", "削除"],
                ].map(([key, label]) => header(key, label))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((skill, index) => {
                const removed = deletions.has(skill.id);
                const normal = skill.id === "normal_attack";
                const selected = skill.template_ids ?? [];
                return (
                  <SortableRow
                    id={skill.id}
                    key={skill.id}
                    aria-label={skill.name}
                    data-pending-delete={removed || undefined}
                    className={`border-t [&>td]:p-2 ${removed ? "bg-muted text-muted-foreground [&>td:not(:last-child)]:opacity-40" : ""}`}
                  >
                    <td>
                      <RowOrder
                        index={index}
                        count={sorted.length}
                        onMove={(direction) => {
                          reorder(moveRow(sorted, index, direction));
                          resetSort();
                        }}
                      />
                    </td>
                    <td>
                      <Input
                        aria-label="名前"
                        disabled={removed}
                        value={skill.name}
                        required
                        maxLength={80}
                        className="w-36"
                        onChange={(e) =>
                          update(skill.id, { name: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <div className="min-w-56 space-y-1">
                        {selected.map((id, index) => (
                          <div key={id} className="flex items-center gap-1">
                            <select
                              aria-label={`効果テンプレート ${index + 1}`}
                              className="h-9 min-w-40 flex-1 rounded-md border bg-background px-2"
                              value={id}
                              disabled={removed || normal}
                              onChange={(e) =>
                                update(skill.id, {
                                  template_ids: selected.map(
                                    (current, position) =>
                                      position === index
                                        ? e.target.value
                                        : current,
                                  ),
                                })
                              }
                            >
                              {templates
                                .filter(
                                  (template) =>
                                    template.id === id ||
                                    !selected.includes(template.id),
                                )
                                .map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.name}
                                  </option>
                                ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`効果 ${index + 1}を外す`}
                              disabled={
                                removed || normal || selected.length <= 1
                              }
                              onClick={() =>
                                update(skill.id, {
                                  template_ids: selected.filter(
                                    (_, position) => position !== index,
                                  ),
                                })
                              }
                            >
                              −
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="効果を追加"
                          disabled={
                            removed ||
                            normal ||
                            selected.length >= 20 ||
                            templates.every((template) =>
                              selected.includes(template.id),
                            )
                          }
                          onClick={() => {
                            const next = templates.find(
                              (template) => !selected.includes(template.id),
                            );
                            if (next)
                              update(skill.id, {
                                template_ids: [...selected, next.id],
                              });
                          }}
                        >
                          ＋ 効果
                        </Button>
                      </div>
                    </td>
                    <td>
                      <select
                        aria-label="属性"
                        className="h-9 rounded-md border bg-background px-2"
                        disabled={removed}
                        value={skill.element ?? "none"}
                        onChange={(event) =>
                          update(skill.id, { element: event.target.value })
                        }
                      >
                        <option value="none">無属性</option>
                        {elements
                          .filter(
                            (element) =>
                              element.enabled || element.id === skill.element,
                          )
                          .map((element) => (
                            <option key={element.id} value={element.id}>
                              {element.name}
                              {!element.enabled && "（無効）"}
                            </option>
                          ))}
                        {skill.element &&
                          skill.element !== "none" &&
                          !elements.some(
                            (element) => element.id === skill.element,
                          ) && (
                            <option value={skill.element}>
                              {skill.element}（旧属性）
                            </option>
                          )}
                      </select>
                    </td>
                    <td>
                      <Input
                        aria-label="消費MP"
                        type="number"
                        required
                        min={0}
                        max={10000}
                        step={1}
                        className="w-24"
                        disabled={removed || normal}
                        value={
                          Number.isFinite(skill.mp_cost) ? skill.mp_cost : ""
                        }
                        onChange={(e) =>
                          update(skill.id, { mp_cost: e.target.valueAsNumber })
                        }
                      />
                    </td>
                    <td>
                      <SkillAnimationGallery
                        skill={skill}
                        disabled={removed}
                        onChange={(selection) => update(skill.id, selection)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label="有効"
                        type="checkbox"
                        disabled={removed || normal}
                        checked={skill.enabled}
                        onChange={(e) =>
                          update(skill.id, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={normal}
                        aria-label={removed ? "削除を取り消す" : "削除"}
                        title={removed ? "削除を取り消す" : "削除"}
                        aria-pressed={removed}
                        onClick={() => toggleDelete(skill.id)}
                      >
                        <X aria-hidden="true" className="size-4" />
                      </Button>
                    </td>
                  </SortableRow>
                );
              })}
              <tr className="border-t">
                <td colSpan={8} className="p-1 text-center">
                  <Button
                    aria-label="スキルを追加"
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => add("attack", "physical")}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </SortableRows>
      </div>
    </section>
  );
}
