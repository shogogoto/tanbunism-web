import { IconPicker } from "~/features/game/GameIcon";
import type {
  EnemyDefinition,
  GameCatalog,
  ItemDefinition,
} from "~/features/game/catalog";
import { Input } from "~/shared/components/ui/input";

const selectClass = "h-9 rounded-md border bg-background px-2 text-sm";
export default function DefinitionTables({
  kind,
  catalog,
  update,
}: {
  kind: "items" | "enemies";
  catalog: GameCatalog;
  update: (
    id: string,
    patch: Partial<ItemDefinition & EnemyDefinition>,
  ) => void;
}) {
  const headers = [
    "名前",
    "素材",
    ...(kind === "items"
      ? ["種類", "発動スキル", "使用回数"]
      : ["ボス用", "速さ", "攻撃スキル", "命中時スキル"]),
    "有効",
  ];
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table
        className="w-full whitespace-nowrap text-sm"
        aria-label={kind === "items" ? "アイテム定義" : "敵定義"}
      >
        <thead className="bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="p-2 text-left font-medium">
                {h}
              </th>
            ))}
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
                      aria-label="種類"
                      className={selectClass}
                      value={item.kind}
                      onChange={(e) => {
                        const value = e.target.value as ItemDefinition["kind"];
                        const skill = catalog.skills.find(
                          (s) =>
                            (s.effect === "equip_attack") ===
                            (value === "weapon"),
                        );
                        update(item.id, {
                          kind: value,
                          max_uses: value === "weapon" ? 30 : 1,
                          skill_id: skill?.id ?? "",
                        });
                      }}
                    >
                      <option value="consumable">消耗品</option>
                      <option value="weapon">武器</option>
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label="発動スキル"
                      required
                      className={selectClass}
                      value={item.skill_id}
                      onChange={(e) =>
                        update(item.id, { skill_id: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        選択
                      </option>
                      {catalog.skills
                        .filter(
                          (s) =>
                            (s.effect === "equip_attack") ===
                            (item.kind === "weapon"),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {!s.enabled && "（無効）"}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <Input
                      aria-label="使用回数"
                      type="number"
                      min={1}
                      max={10000}
                      required
                      className="w-24"
                      value={item.max_uses ?? (item.kind === "weapon" ? 30 : 1)}
                      onChange={(e) =>
                        update(item.id, { max_uses: Number(e.target.value) })
                      }
                    />
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
                    <Input
                      aria-label={`${item.name}の速さ`}
                      type="number"
                      min={1}
                      max={1000}
                      className="w-24"
                      placeholder="共通設定"
                      value={item.speed ?? ""}
                      onChange={(event) =>
                        update(item.id, {
                          speed:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        })
                      }
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
        </tbody>
      </table>
    </div>
  );
}
