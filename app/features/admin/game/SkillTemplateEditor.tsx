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
import {
  changeDetail,
  changeKind,
  changeState,
  effectPatch,
  effectValue,
  isStatus,
  stateRecovery,
  stateResource,
  templateKind,
} from "./templateEffects";
import useTableSort from "./useTableSort";

const selectClass = "h-9 rounded-md border bg-background px-2";
const columns = [
  ["name", "名前"],
  ["target_count", "対象数"],
  ["calculation", "計算"],
  ["kind", "種別"],
  ["detail", "詳細"],
  ["type", "タイプ"],
  ["power", "効果"],
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
      target:
        template.target ??
        (template.effect === "ailment" &&
        ["regen", "refresh"].includes(template.ailment ?? "poison")
          ? "self"
          : ["attack", "damage_mp", "debuff", "ailment"].includes(
                template.effect,
              )
            ? "enemy"
            : "self"),
      mp_cost: 0,
      icon: "sparkles",
      enabled: true,
    }),
  );
  const { sorted, header } = useTableSort(rows, (skill, column) => {
    if (column === "type") return skill.on_wrong?.type ?? "fizzle";
    if (column === "kind") return templateKind(skill);
    if (column === "calculation") return skill.damage_type ?? "physical";
    if (column === "detail")
      return isStatus(skill)
        ? `${skill.effect}:${skill.stat ?? skill.ailment}`
        : skill.effect;
    if (column === "power") return effectValue(skill).value;
    const value = skill[column as keyof SkillDefinition];
    return typeof value === "string" || typeof value === "number" ? value : "";
  });
  function update(id: string, patch: SkillPatch) {
    onChange({
      ...catalog,
      skill_templates: rows.map((skill) =>
        skillTemplate(
          skill.id === id
            ? normalizeSkill({
                ...skill,
                ...patch,
                ...(patch.amount !== undefined &&
                isStatus(skill) &&
                skill.on_wrong?.type === "reduced" &&
                "amount" in skill.on_wrong
                  ? { on_wrong: { ...skill.on_wrong, amount: patch.amount } }
                  : {}),
              })
            : skill,
        ),
      ),
    });
  }
  return (
    <section aria-label="効果テンプレート" className="space-y-2">
      <h3 className="font-semibold">効果テンプレート</h3>
      <p className="text-xs text-muted-foreground">
        回復・ダメージは詳細で指定します。回復の倍率は最大値を基準にします。状態の効果は継続する行動数です。保存で確定します。
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
              const status = isStatus(skill);
              const kind = templateKind(skill);
              const utility = kind === "moves" || kind === "equipment";
              const normal = catalog.skills.some(
                (s) =>
                  s.id === "normal_attack" &&
                  s.template_ids?.includes(skill.id),
              );
              const users = catalog.skills.filter((s) =>
                s.template_ids?.includes(skill.id),
              );
              const reduced = skill.on_wrong?.type === "reduced";
              function number(
                label: string,
                key: "amount" | "stack_limit",
                fallback: number,
              ) {
                return (
                  <Input
                    aria-label={label}
                    title={label}
                    type="number"
                    required
                    className="w-20"
                    min={key === "stack_limit" ? 1 : 0}
                    max={key === "stack_limit" ? 10 : 10000}
                    value={skill[key] ?? fallback}
                    onChange={(e) =>
                      update(skill.id, { [key]: e.target.valueAsNumber })
                    }
                  />
                );
              }
              function power(wrong = false) {
                const { mode, value } = effectValue(skill, wrong);
                const prefix = wrong ? "誤答" : "正答";
                return (
                  <fieldset
                    aria-label={`${prefix}効果`}
                    className="flex items-center gap-1 rounded-md border px-2 py-1"
                  >
                    {reduced && (
                      <span className="text-xs text-muted-foreground">
                        {prefix}
                      </span>
                    )}
                    {status ? (
                      <span className="text-xs">行動数</span>
                    ) : (
                      <select
                        aria-label={`${prefix}効果の指定`}
                        className={selectClass}
                        value={mode}
                        disabled={utility}
                        onChange={(e) =>
                          update(
                            skill.id,
                            effectPatch(
                              skill,
                              e.target.value as "fixed" | "multiplier",
                              e.target.value === "fixed"
                                ? Math.floor(value)
                                : value,
                              wrong,
                            ),
                          )
                        }
                      >
                        <option value="fixed">定数</option>
                        <option value="multiplier">倍率</option>
                      </select>
                    )}
                    <Input
                      aria-label={`${prefix}効果の値`}
                      type="number"
                      required
                      className="w-24"
                      min={status && !wrong ? 1 : 0}
                      max={
                        status
                          ? 20
                          : mode === "multiplier"
                            ? skill.effect === "attack"
                              ? 10
                              : 100
                            : 10000
                      }
                      step={status || mode === "fixed" ? 1 : 0.01}
                      value={Number.isFinite(value) ? value : ""}
                      onChange={(e) =>
                        update(
                          skill.id,
                          effectPatch(
                            skill,
                            mode,
                            e.target.valueAsNumber,
                            wrong,
                          ),
                        )
                      }
                    />
                  </fieldset>
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
                      className="w-36"
                      onChange={(e) =>
                        update(skill.id, { name: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <select
                      aria-label="対象数"
                      className={selectClass}
                      disabled={normal}
                      value={
                        skill.target_count ??
                        (skill.target === "all_enemies" ? "all" : 1)
                      }
                      onChange={(e) =>
                        update(skill.id, {
                          target_count:
                            e.target.value === "all"
                              ? "all"
                              : Number(e.target.value),
                        })
                      }
                    >
                      {[1, 3, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                      <option value="all">全体</option>
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label="計算"
                      className={selectClass}
                      disabled={normal || status || utility}
                      value={skill.damage_type ?? "physical"}
                      onChange={(e) =>
                        update(skill.id, {
                          damage_type: e.target.value as "physical" | "special",
                        })
                      }
                    >
                      <option value="physical">物理</option>
                      <option value="special">特殊</option>
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label="種別"
                      className={selectClass}
                      disabled={normal}
                      value={kind}
                      onChange={(e) =>
                        update(skill.id, changeKind(skill, e.target.value))
                      }
                    >
                      <option value="hp">HP</option>
                      <option value="mp">MP</option>
                      <option value="moves">歩数</option>
                      <option value="status">状態</option>
                      {kind === "equipment" && (
                        <option value="equipment">装備（既存設定）</option>
                      )}
                    </select>
                  </td>
                  <td>
                    {status ? (
                      <div className="flex items-center gap-1">
                        <select
                          aria-label="詳細"
                          className={selectClass}
                          value={stateRecovery(skill) ? "recovery" : "damage"}
                          onChange={(e) =>
                            update(
                              skill.id,
                              changeState(
                                skill,
                                stateResource(skill),
                                e.target.value === "recovery",
                              ),
                            )
                          }
                        >
                          <option value="recovery">回復</option>
                          <option
                            value="damage"
                            disabled={skill.stat === "maxHp"}
                          >
                            ダメージ
                          </option>
                        </select>
                        {
                          <select
                            aria-label="対象ステータス"
                            className={selectClass}
                            value={stateResource(skill)}
                            onChange={(e) =>
                              update(
                                skill.id,
                                changeState(
                                  skill,
                                  e.target.value,
                                  e.target.value === "maxHp" ||
                                    stateRecovery(skill),
                                ),
                              )
                            }
                          >
                            {Object.entries({
                              hp: "HP",
                              mp: "MP",
                              attack: "攻撃力",
                              defense: "守備力",
                              specialAttack: "特攻",
                              specialDefense: "特守",
                              maxHp: "最大HP（バブル）",
                            }).map(([v, label]) => (
                              <option key={v} value={v}>
                                {label}
                              </option>
                            ))}
                          </select>
                        }
                        <select
                          aria-label="状態の値の指定"
                          className={selectClass}
                          value={skill.amount_mode ?? "fixed"}
                          disabled={skill.stat === "maxHp"}
                          onChange={(e) =>
                            update(skill.id, {
                              amount_mode: e.target.value as
                                | "fixed"
                                | "percent",
                            })
                          }
                        >
                          <option value="fixed">定数</option>
                          <option value="percent">比率（%）</option>
                        </select>
                        {number("状態の値", "amount", 0)}
                        <span className="text-xs">重複上限</span>
                        {number("重複上限", "stack_limit", 1)}
                      </div>
                    ) : utility ? (
                      "回復"
                    ) : (
                      <select
                        aria-label="詳細"
                        className={selectClass}
                        disabled={normal}
                        value={
                          skill.effect === "heal_hp" ||
                          skill.effect === "heal_mp"
                            ? "recovery"
                            : "damage"
                        }
                        onChange={(e) =>
                          update(
                            skill.id,
                            changeDetail(skill, e.target.value === "recovery"),
                          )
                        }
                      >
                        <option value="damage">ダメージ</option>
                        <option value="recovery">回復</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {utility ? (
                      "—"
                    ) : (
                      <select
                        aria-label="タイプ"
                        className={selectClass}
                        value={skill.on_wrong?.type ?? "fizzle"}
                        disabled={normal}
                        onChange={(e) =>
                          update(
                            skill.id,
                            e.target.value === "reduced"
                              ? effectPatch(
                                  skill,
                                  effectValue(skill).mode,
                                  status
                                    ? 1
                                    : effectValue(skill).mode === "fixed"
                                      ? Math.floor(effectValue(skill).value / 2)
                                      : effectValue(skill).value / 2,
                                  true,
                                )
                              : {
                                  on_wrong: {
                                    type: e.target.value as
                                      | "counter"
                                      | "fizzle",
                                  },
                                },
                          )
                        }
                      >
                        <option value="counter">反撃</option>
                        <option value="fizzle">不発</option>
                        <option value="reduced">軽減</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {power()}
                      {reduced && power(true)}
                    </div>
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
                            multiplier: 1,
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
