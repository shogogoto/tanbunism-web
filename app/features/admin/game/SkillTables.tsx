import { Plus, X } from "lucide-react";
import {
  AdminNativeTable,
  AdminTableFrame,
  AdminTableSection,
} from "~/features/admin/AdminTable";
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
import RowOrder from "./RowOrder";
import SkillAnimationGallery from "./SkillAnimationGallery";
import SkillTemplateBadges from "./SkillTemplateBadges";
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
    <AdminTableSection aria-label="スキル一覧" title="スキル一覧">
      <AdminTableFrame layout="content">
        <SortableRows
          rows={sorted}
          onReorder={(rows) => {
            reorder(rows);
            resetSort();
          }}
        >
          <AdminNativeTable
            aria-label="スキル一覧"
            layout="content"
            className="text-sm"
          >
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th scope="col" className="w-8">
                  <span className="sr-only">並べ替え</span>
                </th>
                {[
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
              {sorted.map((skill) => {
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
                      <RowOrder />
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
                      <SkillTemplateBadges
                        value={selected}
                        templates={templates}
                        disabled={removed || normal}
                        onChange={(ids) =>
                          update(skill.id, { template_ids: ids })
                        }
                      />
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
                        className="w-20"
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
          </AdminNativeTable>
        </SortableRows>
      </AdminTableFrame>
    </AdminTableSection>
  );
}
