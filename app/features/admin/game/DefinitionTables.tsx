import { Plus } from "lucide-react";
import { IconPicker, gameIcons } from "~/features/game/GameIcon";
import type {
  EnemyDefinition,
  GameCatalog,
  ItemDefinition,
} from "~/features/game/catalog";
import {
  type EnemyStat,
  defaultElements,
  enemyStatLabels,
  isEquipmentSkill,
} from "~/features/game/catalog";
import { characterAsset } from "~/features/game/characterAssets";
import { equipmentParts } from "~/features/game/equipmentSlots";
import { itemCategories, itemCategory } from "~/features/game/itemCategories";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import DefinitionDeleteButton, {
  pendingDeletionClass,
} from "./DefinitionDeleteButton";
import EnemyAffinitiesEditor from "./EnemyAffinitiesEditor";
import RowOrder from "./RowOrder";
import SortableAdminTable from "./SortableAdminTable";
import { SortableRow } from "./SortableRows";

const selectClass = "h-9 rounded-md border bg-background px-2 text-sm";
export default function DefinitionTables({
  kind,
  catalog,
  update,
  add,
  deletions,
  toggleDelete,
  reorder,
}: {
  kind: "items" | "enemies";
  catalog: GameCatalog;
  update: (
    id: string,
    patch: Partial<ItemDefinition & EnemyDefinition>,
  ) => void;
  add?: () => void;
  deletions?: ReadonlySet<string>;
  toggleDelete?: (id: string) => void;
  reorder: (ids: string[]) => void;
}) {
  const headers = [
    "名前",
    "素材",
    ...(kind === "items"
      ? ["カテゴリ", "装備部位", "発動スキル", "使用回数"]
      : [
          "ボス用",
          ...Object.values(enemyStatLabels).map((label) => `${label}倍率`),
          "ガンビットセット",
          "属性",
        ]),
  ];
  const elements = (catalog.elements ?? defaultElements).filter(
    (element) =>
      element.enabled ||
      catalog.enemies.some(
        (enemy) =>
          enemy.weaknesses?.includes(element.id) ||
          enemy.resistances?.includes(element.id),
      ),
  );
  return (
    <SortableAdminTable<ItemDefinition | EnemyDefinition>
      rows={catalog[kind]}
      onReorder={(rows) => reorder(rows.map((row) => row.id))}
      className={`whitespace-nowrap text-sm ${kind === "enemies" ? "[&_tr>td]:px-1 [&_tr>th]:px-1" : ""}`}
      aria-label={kind === "items" ? "アイテム定義" : "敵定義"}
      value={(item, column) => {
        const skillName = (id?: string | null) =>
          catalog.skills.find((skill) => skill.id === id)?.name ?? "";
        if (column === "名前") return item.name;
        if (column === "素材")
          return (
            characterAsset(item.icon)?.label ??
            gameIcons[item.icon as keyof typeof gameIcons]?.label ??
            item.icon
          );
        if (column === "有効") return Number(item.enabled);
        if (column === "削除") return Number(deletions?.has(item.id));
        if ("skill_id" in item) {
          if (column === "カテゴリ")
            return (
              itemCategories.find(
                (category) => category.id === itemCategory(item),
              )?.label ?? ""
            );
          if (column === "装備部位")
            return (
              equipmentParts.find((part) => part.id === item.equipment_part)
                ?.label ?? ""
            );
          if (column === "発動スキル") return skillName(item.skill_id);
          if (column === "使用回数")
            return item.max_uses ?? (item.kind === "weapon" ? 30 : 1);
        } else {
          if (column === "ボス用") return Number(item.boss);
          const stat = (Object.keys(enemyStatLabels) as EnemyStat[]).find(
            (stat) => column === `${enemyStatLabels[stat]}倍率`,
          );
          if (stat) return item.multipliers?.[stat] ?? 1;
          if (column === "ガンビットセット")
            return (
              catalog.gambit_sets?.find(
                (group) => group.id === item.gambit_set_id,
              )?.name ?? ""
            );
          if (column === "属性")
            return [
              ...(item.weaknesses ?? []),
              ...(item.resistances ?? []),
            ].join("/");
        }
        return "";
      }}
    >
      {({ sorted, header }) => (
        <>
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="w-8">
                <span className="sr-only">並べ替え</span>
              </th>
              {headers.map((h) =>
                header(
                  h,
                  h.endsWith("倍率") ? (
                    <abbr title={h} className="no-underline">
                      {h
                        .replace("攻撃力", "攻")
                        .replace("守備力", "守")
                        .replace("速さ", "速")
                        .replace("倍率", "×")}
                    </abbr>
                  ) : (
                    h
                  ),
                ),
              )}
              {header("有効", "有効")}
              {kind === "enemies" && header("削除", "削除")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <SortableRow
                id={item.id}
                key={item.id}
                aria-label={item.name}
                data-pending-delete={deletions?.has(item.id) || undefined}
                className={`border-t [&>td]:p-2 ${deletions?.has(item.id) ? pendingDeletionClass : ""}`}
              >
                <td>
                  <RowOrder />
                </td>
                <td>
                  <Input
                    aria-label="名前"
                    required
                    maxLength={80}
                    className={kind === "enemies" ? "w-28" : "w-40"}
                    value={item.name}
                    onChange={(e) => update(item.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <IconPicker
                    iconOnly={kind === "enemies"}
                    label={`${item.name}の素材`}
                    value={item.icon}
                    onChange={(icon) => update(item.id, { icon })}
                  />
                </td>
                {"skill_id" in item ? (
                  <>
                    <td>
                      <select
                        aria-label="カテゴリ"
                        className={selectClass}
                        value={itemCategory(item)}
                        onChange={(e) =>
                          update(item.id, {
                            category: e.target
                              .value as ItemDefinition["category"],
                          })
                        }
                      >
                        {itemCategories.map(({ id, label }) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label="装備部位"
                        className={selectClass}
                        disabled={item.kind !== "weapon"}
                        value={item.equipment_part ?? ""}
                        onChange={(e) =>
                          update(item.id, {
                            equipment_part:
                              (e.target
                                .value as ItemDefinition["equipment_part"]) ||
                              null,
                          })
                        }
                      >
                        <option value="">自動</option>
                        {equipmentParts.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label="発動スキル"
                        required
                        className={selectClass}
                        value={item.skill_id}
                        onChange={(e) => {
                          const skill = catalog.skills.find(
                            (s) => s.id === e.target.value,
                          );
                          update(item.id, {
                            skill_id: e.target.value,
                            kind:
                              skill && isEquipmentSkill(skill)
                                ? "weapon"
                                : "consumable",
                          });
                        }}
                      >
                        <option value="" disabled>
                          選択
                        </option>
                        {catalog.skills.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {!s.enabled && "（無効）"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Input
                          aria-label="使用回数"
                          type="number"
                          min={1}
                          max={10000}
                          required
                          className="w-24"
                          value={
                            item.max_uses ?? (item.kind === "weapon" ? 30 : 1)
                          }
                          onChange={(e) =>
                            update(item.id, {
                              max_uses: Number(e.target.value),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => update(item.id, { max_uses: 1 })}
                        >
                          1回
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <input
                        aria-label="ボス用"
                        type="checkbox"
                        checked={item.boss}
                        onChange={(e) =>
                          update(item.id, { boss: e.target.checked })
                        }
                      />
                    </td>
                    {(Object.keys(enemyStatLabels) as EnemyStat[]).map(
                      (stat) => (
                        <td key={stat}>
                          <Input
                            type="number"
                            aria-label={`${enemyStatLabels[stat]}倍率`}
                            className="w-14 px-1 text-center text-xs"
                            min={0.01}
                            max={400}
                            step="any"
                            required
                            value={
                              Number.isNaN(item.multipliers?.[stat])
                                ? ""
                                : (item.multipliers?.[stat] ?? 1)
                            }
                            onChange={(event) =>
                              update(item.id, {
                                multipliers: {
                                  ...item.multipliers,
                                  [stat]: event.target.valueAsNumber,
                                },
                              })
                            }
                          />
                        </td>
                      ),
                    )}
                    <td>
                      <select
                        aria-label="ガンビットセット"
                        className={`${selectClass} w-32`}
                        value={item.gambit_set_id ?? ""}
                        onChange={(event) =>
                          update(item.id, {
                            gambit_set_id: event.target.value || null,
                            gambits: [],
                          })
                        }
                      >
                        <option value="">なし（通常攻撃）</option>
                        {catalog.gambit_sets?.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <EnemyAffinitiesEditor
                        enemy={item}
                        elements={elements}
                        onChange={(patch) => update(item.id, patch)}
                      />
                    </td>
                  </>
                )}
                <td>
                  <input
                    aria-label="有効"
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      update(item.id, { enabled: e.target.checked })
                    }
                  />
                </td>
                {kind === "enemies" && (
                  <td>
                    <DefinitionDeleteButton
                      removed={deletions?.has(item.id) ?? false}
                      disabled={!toggleDelete}
                      onClick={() => toggleDelete?.(item.id)}
                    />
                  </td>
                )}
              </SortableRow>
            ))}
            {kind === "items" && add && (
              <tr className="border-t">
                <td colSpan={headers.length + 2}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    aria-label="アイテムを追加"
                    disabled={!catalog.skills.length}
                    onClick={add}
                  >
                    <Plus className="size-4" />
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </>
      )}
    </SortableAdminTable>
  );
}
