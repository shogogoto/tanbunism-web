import { AdminNativeTable } from "~/features/admin/AdminTable";
import type { EnemyGambitRule, GameCatalog } from "~/features/game/catalog";
import {
  triggerTargets,
  triggerVariant,
} from "~/features/game/triggerVariants";
import { Button } from "~/shared/components/ui/button";
import { RowDragHandle, SortableRow, SortableRows } from "./SortableRows";

export default function GambitRulesEditor({
  name,
  rules,
  catalog,
  onChange,
}: {
  name: string;
  rules: EnemyGambitRule[];
  catalog: GameCatalog;
  onChange: (rules: EnemyGambitRule[]) => void;
}) {
  const triggers = catalog.triggers ?? [];
  const skills = catalog.skills.filter(
    (s) =>
      s.enabled &&
      !(s.effects?.length ? s.effects : [s]).some((e) =>
        ["recover_moves", "equip_attack"].includes(String(e.effect)),
      ),
  );
  const patch = (index: number, value: Partial<EnemyGambitRule>) =>
    onChange(rules.map((r, i) => (i === index ? { ...r, ...value } : r)));
  const select =
    "h-9 min-w-0 max-w-44 rounded-md border bg-background px-2 text-sm";
  const rows = rules.map((rule, index) => ({ id: String(index), rule }));
  return (
    <div className="space-y-2">
      <SortableRows
        rows={rows}
        onReorder={(next) => onChange(next.map(({ rule }) => rule))}
      >
        <AdminNativeTable
          layout="content"
          aria-label={`${name}のガンビット`}
          className="whitespace-nowrap text-sm"
        >
          <thead>
            <tr>
              {[
                "優先",
                "トリガー",
                "変型",
                "対象",
                "スキル",
                "有効",
                "削除",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ rule, id }, index) => {
              const root = triggers.find((t) => t.id === rule.trigger_id);
              const resolved = root
                ? triggerVariant(root, rule.trigger_variant_id)
                : undefined;
              return (
                <SortableRow
                  id={id}
                  key={id}
                  aria-label={`ガンビット ${index + 1}`}
                >
                  <td>
                    <div className="flex items-center gap-1">
                      <RowDragHandle />
                      {index + 1}
                    </div>
                  </td>
                  <td>
                    <select
                      className={select}
                      aria-label="トリガー"
                      value={rule.trigger_id}
                      onChange={(e) =>
                        patch(index, {
                          trigger_id: e.target.value,
                          trigger_variant_id: null,
                        })
                      }
                    >
                      {!root && (
                        <option value={rule.trigger_id}>利用不可</option>
                      )}
                      {triggers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {!t.enabled && "（無効）"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={select}
                      aria-label="変型"
                      value={rule.trigger_variant_id ?? ""}
                      onChange={(e) =>
                        patch(index, {
                          trigger_variant_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">基本</option>
                      {rule.trigger_variant_id && !resolved && (
                        <option value={rule.trigger_variant_id}>
                          利用不可
                        </option>
                      )}
                      {root?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.resolved_name ?? v.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {resolved
                      ? triggerTargets[resolved.target ?? "enemy"]
                      : "—"}
                  </td>
                  <td>
                    <select
                      className={select}
                      aria-label="使用スキル"
                      value={rule.skill_id}
                      onChange={(e) =>
                        patch(index, { skill_id: e.target.value })
                      }
                    >
                      {!skills.some((s) => s.id === rule.skill_id) && (
                        <option value={rule.skill_id}>利用不可</option>
                      )}
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · MP {s.mp_cost}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label="有効"
                      checked={rule.enabled}
                      onChange={(e) =>
                        patch(index, { enabled: e.target.checked })
                      }
                    />
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`${index + 1}番を削除`}
                      onClick={() =>
                        onChange(rules.filter((_, i) => i !== index))
                      }
                    >
                      ×
                    </Button>
                  </td>
                </SortableRow>
              );
            })}
          </tbody>
        </AdminNativeTable>
      </SortableRows>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        aria-label={`${name}に条件を追加`}
        disabled={
          rules.length >= 20 ||
          !triggers.some((t) => t.enabled) ||
          !skills.length
        }
        onClick={() =>
          onChange([
            ...rules,
            {
              trigger_id: triggers.find((t) => t.enabled)?.id ?? "",
              skill_id: skills[0]?.id ?? "",
              enabled: true,
            },
          ])
        }
      >
        ＋
      </Button>
    </div>
  );
}
