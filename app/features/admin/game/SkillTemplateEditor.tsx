import { Plus } from "lucide-react";
import {
  type GameCatalog,
  type SkillDefinition,
  type SkillPatch,
  normalizeSkill,
  skillTemplate,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import useTableSort from "./useTableSort";

const selectClass = "h-9 min-w-24 rounded-md border bg-background px-2";
const kinds = {
  heal_hp: "HP回復",
  heal_mp: "MP回復",
  physical: "物理",
  special: "特殊",
  buff: "バフ",
  debuff: "デバフ",
  ailment: "状態異常",
  recover_moves: "歩数回復",
  equip_attack: "装備",
};
const columns = [
  ["name", "名前"],
  ["type", "タイプ"],
  ["kind", "種別"],
  ["target", "対象"],
  ["target_count", "対象数"],
  ["stat", "対象ステータス"],
  ["ailment", "状態異常"],
  ["amount_mode", "効果量の指定"],
  ["amount", "正答効果量"],
  ["wrong_amount", "誤答効果量"],
  ["multiplier", "正答攻撃倍率"],
  ["wrong_multiplier", "誤答攻撃倍率"],
  ["wrong_apply", "誤答付与"],
  ["duration_turns", "持続（行動数）"],
  ["stack_limit", "重複上限"],
  ["deleted", "削除"],
];

export default function SkillTemplateEditor({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (catalog: GameCatalog) => void }) {
  const templates = catalog.skill_templates ?? [];
  const rows = templates.map((template) =>
    normalizeSkill({
      ...template,
      mp_cost: 0,
      icon: "sparkles",
      enabled: true,
    }),
  );
  const { sorted, header } = useTableSort(rows, (skill, column) => {
    if (column === "type") return skill.on_wrong?.type ?? "fizzle";
    if (column === "kind")
      return skill.effect === "attack"
        ? (skill.damage_type ?? "physical")
        : skill.effect;
    if (column === "wrong_amount")
      return skill.on_wrong?.type === "reduced" && "amount" in skill.on_wrong
        ? skill.on_wrong.amount
        : 0;
    if (column === "wrong_multiplier")
      return skill.on_wrong?.type === "reduced" &&
        "multiplier" in skill.on_wrong
        ? skill.on_wrong.multiplier
        : 0;
    const value = skill[column as keyof SkillDefinition];
    return typeof value === "string" || typeof value === "number" ? value : "";
  });
  function update(id: string, patch: SkillPatch) {
    onChange({
      ...catalog,
      skill_templates: rows.map((skill) =>
        skillTemplate(
          skill.id === id ? normalizeSkill({ ...skill, ...patch }) : skill,
        ),
      ),
    });
  }
  return (
    <section aria-label="効果テンプレート" className="space-y-2">
      <h3 className="font-semibold">効果テンプレート</h3>
      <p className="text-xs text-muted-foreground">
        変更は使用中の全スキルに反映されます。持続は完了した行動数で数え、戦闘終了時に解除されます。保存で確定します。
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table
          aria-label="効果テンプレート一覧"
          className="w-full whitespace-nowrap text-sm"
        >
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>{columns.map(([key, label]) => header(key, label))}</tr>
          </thead>
          <tbody>
            {sorted.map((skill) => {
              const attack = skill.effect === "attack";
              const status = ["buff", "debuff", "ailment"].includes(
                skill.effect,
              );
              const ailment = skill.effect === "ailment";
              const utility = ["recover_moves", "equip_attack"].includes(
                skill.effect,
              );
              const enemyTarget = ["attack", "debuff", "ailment"].includes(
                skill.effect,
              );
              const wrong = skill.on_wrong;
              const reduced = wrong?.type === "reduced";
              const normal = catalog.skills.some(
                (s) =>
                  s.id === "normal_attack" &&
                  s.template_ids?.includes(skill.id),
              );
              const users = catalog.skills.filter((s) =>
                s.template_ids?.includes(skill.id),
              );
              function numeric(
                label: string,
                key:
                  | "amount"
                  | "multiplier"
                  | "duration_turns"
                  | "stack_limit"
                  | "target_count",
                min: number,
                max: number,
                fallback = 0,
                disabled = false,
              ) {
                const value = (skill as SkillPatch)[key] ?? fallback;
                return (
                  <Input
                    aria-label={label}
                    type="number"
                    className="w-24"
                    required
                    min={min}
                    max={max}
                    step={key === "multiplier" ? 0.1 : 1}
                    value={Number.isFinite(value) ? value : ""}
                    disabled={disabled}
                    onChange={(e) =>
                      update(skill.id, { [key]: e.target.valueAsNumber })
                    }
                  />
                );
              }
              function wrongNumeric(key: "amount" | "multiplier") {
                const value =
                  reduced && key in wrong
                    ? Number(wrong[key as keyof typeof wrong])
                    : 0;
                return (
                  <Input
                    aria-label={
                      key === "amount" ? "誤答効果量" : "誤答攻撃倍率"
                    }
                    type="number"
                    required
                    className="w-24"
                    min={0}
                    max={key === "amount" ? 10000 : 10}
                    step={key === "amount" ? 1 : 0.1}
                    value={Number.isFinite(value) ? value : ""}
                    disabled={!reduced}
                    onChange={(e) =>
                      update(skill.id, {
                        on_wrong: {
                          ...wrong,
                          type: "reduced",
                          [key]: e.target.valueAsNumber,
                        } as SkillPatch["on_wrong"],
                      })
                    }
                  />
                );
              }
              return (
                <tr
                  key={skill.id}
                  aria-label={skill.name}
                  className="border-t [&>td]:p-2"
                >
                  <td>
                    <Input
                      aria-label="名前"
                      value={skill.name}
                      required
                      maxLength={80}
                      className="w-40"
                      onChange={(e) =>
                        update(skill.id, { name: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    {utility ? (
                      "—"
                    ) : (
                      <select
                        aria-label="タイプ"
                        className={selectClass}
                        value={wrong?.type ?? "fizzle"}
                        disabled={normal}
                        onChange={(e) =>
                          update(skill.id, {
                            on_wrong:
                              e.target.value === "reduced"
                                ? ailment
                                  ? { type: "reduced", apply: false }
                                  : {
                                      type: "reduced",
                                      amount: Math.floor(skill.amount / 2),
                                      ...(attack
                                        ? { multiplier: skill.multiplier / 2 }
                                        : {}),
                                    }
                                : {
                                    type: e.target.value as
                                      | "counter"
                                      | "fizzle",
                                  },
                          })
                        }
                      >
                        {attack && <option value="counter">反撃</option>}
                        <option value="fizzle">不発</option>
                        <option value="reduced">軽減</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <select
                      aria-label="種別"
                      className={selectClass}
                      disabled={normal}
                      value={
                        attack
                          ? (skill.damage_type ?? "physical")
                          : skill.effect
                      }
                      onChange={(e) => {
                        const kind = e.target.value;
                        update(skill.id, {
                          effect: (kind === "physical" || kind === "special"
                            ? "attack"
                            : kind) as SkillDefinition["effect"],
                          damage_type:
                            kind === "special" ? "special" : "physical",
                          target: [
                            "physical",
                            "special",
                            "debuff",
                            "ailment",
                          ].includes(kind)
                            ? "enemy"
                            : "self",
                          amount:
                            kind === "ailment"
                              ? Math.max(1, skill.amount)
                              : skill.amount,
                          on_wrong:
                            wrong?.type === "counter" &&
                            !["physical", "special"].includes(kind)
                              ? { type: "fizzle" }
                              : wrong,
                        });
                      }}
                    >
                      {Object.entries(kinds).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {enemyTarget ? (
                      <select
                        aria-label="対象"
                        className={selectClass}
                        value={skill.target}
                        disabled={normal}
                        onChange={(e) =>
                          update(skill.id, {
                            target: e.target.value as "enemy" | "all_enemies",
                          })
                        }
                      >
                        <option value="enemy">敵</option>
                        <option value="all_enemies">敵全体</option>
                      </select>
                    ) : (
                      "自分"
                    )}
                  </td>
                  <td>
                    {enemyTarget
                      ? numeric(
                          "対象数",
                          "target_count",
                          1,
                          5,
                          1,
                          normal || skill.target === "all_enemies",
                        )
                      : "—"}
                  </td>
                  <td>
                    {skill.effect === "buff" || skill.effect === "debuff" ? (
                      <select
                        aria-label="対象ステータス"
                        className={selectClass}
                        value={skill.stat ?? "attack"}
                        onChange={(e) =>
                          update(skill.id, {
                            stat: e.target.value as SkillPatch["stat"],
                            ...(e.target.value === "maxHp"
                              ? { amount_mode: "percent" as const }
                              : {}),
                          })
                        }
                      >
                        <option value="attack">攻撃力</option>
                        <option value="defense">守備力</option>
                        <option value="specialAttack">特攻</option>
                        <option value="specialDefense">特守</option>
                        {skill.effect === "buff" && (
                          <option value="maxHp">最大HP（バブル）</option>
                        )}
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {ailment ? (
                      <select
                        aria-label="状態異常の種類"
                        className={selectClass}
                        value={skill.ailment ?? "poison"}
                        onChange={(e) =>
                          update(skill.id, {
                            ailment: e.target.value as "poison" | "curse",
                          })
                        }
                      >
                        <option value="poison">毒</option>
                        <option value="curse">呪い</option>
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {utility ? (
                      "定数"
                    ) : (
                      <select
                        aria-label="効果量の指定"
                        className={selectClass}
                        value={skill.amount_mode ?? "fixed"}
                        disabled={skill.stat === "maxHp"}
                        onChange={(e) =>
                          update(skill.id, {
                            amount_mode: e.target.value as "fixed" | "percent",
                          })
                        }
                      >
                        <option value="fixed">定数</option>
                        <option value="percent">比率（%）</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {numeric(
                      ailment ? "毎行動効果量" : "効果量",
                      "amount",
                      ailment ? 1 : 0,
                      10000,
                    )}
                  </td>
                  <td>{!utility && !ailment ? wrongNumeric("amount") : "—"}</td>
                  <td>
                    {attack ? numeric("攻撃倍率", "multiplier", 0, 10, 1) : "—"}
                  </td>
                  <td>{attack ? wrongNumeric("multiplier") : "—"}</td>
                  <td>
                    {ailment ? (
                      <select
                        aria-label="誤答付与"
                        className={selectClass}
                        disabled={!reduced}
                        value={
                          reduced && "apply" in wrong && wrong.apply
                            ? "yes"
                            : "no"
                        }
                        onChange={(e) =>
                          update(skill.id, {
                            on_wrong: {
                              type: "reduced",
                              apply: e.target.value === "yes",
                            },
                          })
                        }
                      >
                        <option value="no">付与しない</option>
                        <option value="yes">付与する</option>
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {status
                      ? numeric("持続（行動数）", "duration_turns", 1, 20, 3)
                      : "—"}
                  </td>
                  <td>
                    {status
                      ? numeric("重複上限", "stack_limit", 1, 10, 1)
                      : "—"}
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={users.length > 0}
                      title={
                        users.length
                          ? `使用中: ${users.map((s) => s.name).join("、")}`
                          : undefined
                      }
                      onClick={() =>
                        onChange({
                          ...catalog,
                          skill_templates: templates.filter(
                            (t) => t.id !== skill.id,
                          ),
                        })
                      }
                    >
                      削除
                    </Button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t">
              <td colSpan={columns.length} className="p-1 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="効果テンプレートを追加"
                  onClick={() =>
                    onChange({
                      ...catalog,
                      skill_templates: [
                        ...templates,
                        skillTemplate(
                          normalizeSkill({
                            id: `effect_${crypto.randomUUID().replaceAll("-", "")}`,
                            name: "新しい効果",
                            icon: "sparkles",
                            enabled: true,
                            effect: "attack",
                            target: "enemy",
                            amount: 0,
                            mp_cost: 0,
                          }),
                        ),
                      ],
                    })
                  }
                >
                  <Plus aria-hidden="true" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
