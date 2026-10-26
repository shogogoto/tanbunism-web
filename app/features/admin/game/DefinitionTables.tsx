import { Plus } from "lucide-react";
import { AdminNativeTable, AdminTableFrame } from "~/features/admin/AdminTable";
import GameIcon, { IconPicker } from "~/features/game/GameIcon";
import type {
  EnemyDefinition,
  GameCatalog,
  ItemDefinition,
} from "~/features/game/catalog";
import { defaultElements, isEquipmentSkill } from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import EnemyGambitEditor from "./EnemyGambitEditor";
import EnemyMultipliersEditor from "./EnemyMultipliersEditor";

const selectClass = "h-9 rounded-md border bg-background px-2 text-sm";
export default function DefinitionTables({
  kind,
  catalog,
  update,
  add,
}: {
  kind: "items" | "enemies";
  catalog: GameCatalog;
  update: (
    id: string,
    patch: Partial<ItemDefinition & EnemyDefinition>,
  ) => void;
  add?: () => void;
}) {
  const headers = [
    "名前",
    "素材",
    ...(kind === "items"
      ? ["発動スキル", "使用回数"]
      : ["ボス用", "能力倍率", "ガンビット", "攻撃スキル", "命中時スキル"]),
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
    <AdminTableFrame layout="content">
      <AdminNativeTable
        layout="content"
        className="whitespace-nowrap text-sm"
        aria-label={kind === "items" ? "アイテム定義" : "敵定義"}
      >
        {kind === "enemies" && (
          <caption className="caption-top p-2 text-left text-xs text-muted-foreground">
            属性はクリックで「中立 → 弱点 → 耐性 → 中立」と切り替えます。
          </caption>
        )}
        <thead className="bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="p-2 text-left font-medium">
                {h}
              </th>
            ))}
            {kind === "enemies" &&
              elements.map((element) => (
                <th
                  key={element.id}
                  scope="col"
                  className="p-2 text-center font-medium"
                  style={{ color: element.color }}
                >
                  <span className="inline-flex items-center gap-1">
                    <GameIcon icon={element.icon} className="size-3" />
                    {element.name}
                    {!element.enabled && "（無効）"}
                  </span>
                </th>
              ))}
            <th scope="col" className="p-2 text-left font-medium">
              有効
            </th>
          </tr>
        </thead>
        <tbody>
          {catalog[kind].map((item) => (
            <tr
              key={item.id}
              aria-label={item.name}
              className="border-t [&>td]:p-2"
            >
              <td>
                <Input
                  aria-label="名前"
                  required
                  maxLength={80}
                  className="w-40"
                  value={item.name}
                  onChange={(e) => update(item.id, { name: e.target.value })}
                />
              </td>
              <td>
                <IconPicker
                  label={`${item.name}の素材`}
                  value={item.icon}
                  onChange={(icon) => update(item.id, { icon })}
                />
              </td>
              {"skill_id" in item ? (
                <>
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
                          update(item.id, { max_uses: Number(e.target.value) })
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
                  <td>
                    <EnemyMultipliersEditor
                      enemy={item}
                      onChange={(patch) => update(item.id, patch)}
                    />
                  </td>
                  <td>
                    <EnemyGambitEditor
                      enemy={item}
                      catalog={catalog}
                      onChange={(gambits) => update(item.id, { gambits })}
                    />
                  </td>
                  <td>
                    <select
                      aria-label="攻撃スキル"
                      className={selectClass}
                      value={item.attack_skill_id ?? ""}
                      onChange={(e) =>
                        update(item.id, {
                          attack_skill_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">通常攻撃</option>
                      {catalog.skills
                        .filter((s) =>
                          s.effects?.length
                            ? s.effects.some(
                                (effect) => effect.effect === "attack",
                              )
                            : s.effect === "attack",
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label="命中時スキル"
                      className={selectClass}
                      value={item.on_hit_skill_id ?? ""}
                      onChange={(e) =>
                        update(item.id, {
                          on_hit_skill_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">なし</option>
                      {catalog.skills
                        .filter((s) =>
                          s.effects?.length
                            ? s.effects.every(
                                (effect) =>
                                  effect.effect === "debuff" ||
                                  effect.effect === "ailment",
                              )
                            : s.effect === "debuff" || s.effect === "ailment",
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  {elements.map((element) => {
                    const state = item.weaknesses?.includes(element.id)
                      ? "weak"
                      : item.resistances?.includes(element.id)
                        ? "resistant"
                        : "neutral";
                    const label = {
                      weak: "弱点",
                      resistant: "耐性",
                      neutral: "中立",
                    }[state];
                    return (
                      <td key={element.id} className="text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!element.enabled}
                          aria-label={`${item.name}の${element.name}：${label}`}
                          title="中立 → 弱点 → 耐性 → 中立"
                          className={`min-w-14 ${state === "weak" ? "border-rose-500/50 bg-rose-500/10 text-rose-500" : state === "resistant" ? "border-sky-500/50 bg-sky-500/10 text-sky-500" : "text-muted-foreground"}`}
                          onClick={() =>
                            update(item.id, {
                              weaknesses: [
                                ...(item.weaknesses ?? []).filter(
                                  (key) => key !== element.id,
                                ),
                                ...(state === "neutral" ? [element.id] : []),
                              ],
                              resistances: [
                                ...(item.resistances ?? []).filter(
                                  (key) => key !== element.id,
                                ),
                                ...(state === "weak" ? [element.id] : []),
                              ],
                            })
                          }
                        >
                          {label}
                        </Button>
                      </td>
                    );
                  })}
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
            </tr>
          ))}
          {kind === "items" && add && (
            <tr className="border-t">
              <td colSpan={5}>
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
      </AdminNativeTable>
    </AdminTableFrame>
  );
}
