import { Plus } from "lucide-react";
import {
  type SkillDefinition,
  type SkillPatch,
  effectLabels,
} from "~/features/game/catalog";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import SkillAnimationGallery from "./SkillAnimationGallery";

const selectClass = "h-9 rounded-md border bg-background px-2 text-sm";
export const skillGroups = [
  ["回復", ["heal_hp", "heal_mp"], null],
  ["物理攻撃", ["attack"], "physical"],
  ["特殊攻撃", ["attack"], "special"],
  ["バフ", ["buff"], null],
  ["デバフ", ["debuff"], null],
  ["状態異常", ["ailment"], null],
  ["その他", ["recover_moves", "equip_attack"], null],
] as const;

export default function SkillTables({
  skills,
  update,
  add,
  deletions,
  toggleDelete,
}: {
  skills: SkillDefinition[];
  update: (id: string, patch: SkillPatch) => void;
  add: (
    effect: SkillDefinition["effect"],
    damageType?: "physical" | "special",
  ) => void;
  deletions: Set<string>;
  toggleDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {skillGroups.map(([title, effects, damageType]) => {
        const status = ["buff", "debuff", "ailment"].includes(effects[0]);
        const stat = effects[0] === "buff" || effects[0] === "debuff";
        const attack = effects[0] === "attack";
        const ailment = effects[0] === "ailment";
        const combat = title !== "その他";
        const enemyTarget = attack || effects[0] === "debuff" || ailment;
        const headers = [
          "名前",
          "効果",
          ...(combat ? ["タイプ"] : []),
          "対象",
          ...(enemyTarget ? ["対象数"] : []),
          ...(stat ? ["対象ステータス"] : []),
          ...(effects[0] === "ailment" ? ["状態異常"] : []),
          ailment ? "毎ターン効果量" : combat ? "正答効果量" : "効果量",
          ...(combat && !ailment ? ["誤答効果量"] : []),
          ...(ailment ? ["正答付与", "誤答付与"] : []),
          ...(combat ? ["指定方式"] : []),
          ...(attack ? ["正答攻撃倍率", "誤答攻撃倍率"] : []),
          ...(status ? ["持続ターン", "重複上限"] : []),
          "消費MP",
          "演出",
          "有効",
          "削除",
        ];
        const rows = skills.filter(
          (s) =>
            (effects as readonly string[]).includes(s.effect) &&
            (!damageType ||
              (s.effect === "attack" &&
                (s.damage_type ?? "physical") === damageType)),
        );
        return (
          <section key={title} aria-label={`${title}スキル`}>
            <h3 className="mb-2 font-semibold">{title}</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="p-2 text-left font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const removed = deletions.has(s.id);
                    const wrong = s.on_wrong;
                    const reduced = wrong?.type === "reduced";
                    const wrongValue = (key: "amount" | "multiplier") => {
                      const value =
                        reduced && "amount" in wrong
                          ? key === "amount"
                            ? wrong.amount
                            : "multiplier" in wrong
                              ? wrong.multiplier
                              : 0
                          : Number.NaN;
                      return Number.isFinite(value) ? value : "";
                    };
                    const wrongNumeric = (key: "amount" | "multiplier") => (
                      <Input
                        aria-label={
                          key === "amount" ? "誤答効果量" : "誤答攻撃倍率"
                        }
                        disabled={removed || !reduced}
                        className="w-24"
                        type="number"
                        min={0}
                        max={key === "amount" ? 10000 : 10}
                        step={key === "amount" ? 1 : 0.1}
                        required={reduced}
                        value={wrongValue(key)}
                        onChange={(event) =>
                          update(s.id, {
                            on_wrong: {
                              type: "reduced",
                              amount:
                                reduced && "amount" in wrong ? wrong.amount : 0,
                              ...(s.effect === "attack"
                                ? {
                                    multiplier:
                                      reduced && "multiplier" in wrong
                                        ? wrong.multiplier
                                        : 0.5,
                                  }
                                : {}),
                              [key]: event.target.valueAsNumber,
                            },
                          })
                        }
                      />
                    );
                    const numeric = (
                      label: string,
                      key:
                        | "amount"
                        | "multiplier"
                        | "mp_cost"
                        | "duration_turns"
                        | "stack_limit",
                      min: number,
                      max: number,
                      fallback = 0,
                      step = 1,
                    ) => (
                      <Input
                        disabled={removed}
                        aria-label={label}
                        className="w-24"
                        type="number"
                        required
                        min={min}
                        max={max}
                        step={step}
                        value={
                          s[key] === undefined
                            ? fallback
                            : Number.isFinite(s[key])
                              ? s[key]
                              : ""
                        }
                        onChange={(e) =>
                          update(s.id, { [key]: e.target.valueAsNumber })
                        }
                      />
                    );
                    return (
                      <tr
                        key={s.id}
                        aria-label={s.name}
                        className={`border-t [&>td]:p-2 ${removed ? "bg-muted text-muted-foreground [&>td:not(:last-child)]:opacity-40" : ""}`}
                        data-pending-delete={removed || undefined}
                      >
                        <td>
                          <Input
                            disabled={removed}
                            aria-label="名前"
                            value={s.name}
                            required
                            maxLength={80}
                            className="w-36"
                            onChange={(e) =>
                              update(s.id, { name: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <select
                            disabled={removed}
                            aria-label="効果"
                            className={selectClass}
                            value={
                              attack && s.effect === "attack"
                                ? (s.damage_type ?? "physical")
                                : s.effect
                            }
                            onChange={(e) =>
                              update(
                                s.id,
                                attack
                                  ? {
                                      damage_type: e.target.value as
                                        | "physical"
                                        | "special",
                                    }
                                  : {
                                      effect: e.target
                                        .value as SkillDefinition["effect"],
                                    },
                              )
                            }
                          >
                            {attack ? (
                              <>
                                <option value="physical">物理攻撃</option>
                                <option value="special">特殊攻撃</option>
                              </>
                            ) : (
                              effects.map((effect) => (
                                <option key={effect} value={effect}>
                                  {effectLabels[effect]}
                                </option>
                              ))
                            )}
                          </select>
                        </td>
                        {combat && (
                          <td>
                            <select
                              aria-label="タイプ"
                              className={selectClass}
                              disabled={removed}
                              value={wrong?.type ?? "fizzle"}
                              onChange={(event) =>
                                update(s.id, {
                                  on_wrong:
                                    event.target.value === "reduced"
                                      ? s.effect === "ailment"
                                        ? { type: "reduced", apply: false }
                                        : {
                                            type: "reduced",
                                            amount: Math.floor(s.amount / 2),
                                            ...(s.effect === "attack"
                                              ? { multiplier: s.multiplier / 2 }
                                              : {}),
                                          }
                                      : {
                                          type: event.target.value as
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
                          </td>
                        )}
                        <td>
                          {["attack", "debuff", "ailment"].includes(
                            s.effect,
                          ) ? (
                            <select
                              disabled={removed}
                              aria-label="対象"
                              className={selectClass}
                              value={s.target}
                              onChange={(e) =>
                                update(s.id, {
                                  target: e.target
                                    .value as SkillDefinition["target"],
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
                        {enemyTarget && (
                          <td>
                            <Input
                              aria-label="対象数"
                              className="w-20"
                              type="number"
                              min={1}
                              max={5}
                              step={1}
                              required
                              disabled={removed || s.target === "all_enemies"}
                              value={
                                "target_count" in s &&
                                s.target_count !== undefined
                                  ? Number.isFinite(s.target_count)
                                    ? s.target_count
                                    : ""
                                  : 1
                              }
                              onChange={(event) =>
                                update(s.id, {
                                  target_count: event.target.valueAsNumber,
                                })
                              }
                            />
                          </td>
                        )}
                        {stat && (
                          <td>
                            <select
                              disabled={removed}
                              aria-label="対象ステータス"
                              className={selectClass}
                              value={s.stat ?? "attack"}
                              onChange={(e) =>
                                update(s.id, {
                                  stat: e.target
                                    .value as SkillDefinition["stat"],
                                  ...(e.target.value === "maxHp"
                                    ? { amount_mode: "percent" }
                                    : {}),
                                })
                              }
                            >
                              <option value="attack">攻撃力</option>
                              <option value="defense">守備力</option>
                              <option value="specialAttack">特攻</option>
                              <option value="specialDefense">特守</option>
                              {s.effect === "buff" && (
                                <option value="maxHp">最大HP（バブル）</option>
                              )}
                            </select>
                          </td>
                        )}
                        {s.effect === "ailment" && (
                          <td>
                            <select
                              disabled={removed}
                              aria-label="状態異常の種類"
                              className={selectClass}
                              value={s.ailment ?? "poison"}
                              onChange={(e) =>
                                update(s.id, {
                                  ailment: e.target.value as "poison" | "curse",
                                })
                              }
                            >
                              <option value="poison">毒（HP減少）</option>
                              <option value="curse">呪い（MP減少）</option>
                            </select>
                          </td>
                        )}
                        <td>
                          {numeric(
                            s.effect === "attack" ? "加算ダメージ" : "効果量",
                            "amount",
                            s.effect === "ailment" ? 1 : 0,
                            10000,
                          )}
                        </td>
                        {combat && !ailment && (
                          <td>{wrongNumeric("amount")}</td>
                        )}
                        {ailment && (
                          <>
                            <td>付与する</td>
                            <td>
                              <select
                                aria-label="誤答付与"
                                className={selectClass}
                                disabled={removed || !reduced}
                                value={
                                  reduced && "apply" in wrong && wrong.apply
                                    ? "yes"
                                    : "no"
                                }
                                onChange={(event) =>
                                  update(s.id, {
                                    on_wrong: {
                                      type: "reduced",
                                      apply: event.target.value === "yes",
                                    },
                                  })
                                }
                              >
                                <option value="no">付与しない</option>
                                <option value="yes">付与する</option>
                              </select>
                            </td>
                          </>
                        )}
                        {title !== "その他" && (
                          <td>
                            <select
                              aria-label="効果量の指定"
                              className={selectClass}
                              value={s.amount_mode ?? "fixed"}
                              disabled={removed || s.stat === "maxHp"}
                              onChange={(e) =>
                                update(s.id, {
                                  amount_mode: e.target.value as
                                    | "fixed"
                                    | "percent",
                                })
                              }
                            >
                              <option value="fixed">固定値</option>
                              <option value="percent">割合（%）</option>
                            </select>
                          </td>
                        )}
                        {attack && (
                          <>
                            <td>
                              {numeric("攻撃倍率", "multiplier", 0, 10, 1, 0.1)}
                            </td>
                            <td>{wrongNumeric("multiplier")}</td>
                          </>
                        )}
                        {status && (
                          <>
                            <td>
                              {numeric(
                                "持続ターン",
                                "duration_turns",
                                1,
                                20,
                                3,
                              )}
                            </td>
                            <td>
                              {numeric("重複上限", "stack_limit", 1, 10, 1)}
                            </td>
                          </>
                        )}
                        <td>{numeric("消費MP", "mp_cost", 0, 10000)}</td>
                        <td>
                          <SkillAnimationGallery
                            disabled={removed}
                            skill={s}
                            onChange={(selection) => update(s.id, selection)}
                          />
                        </td>
                        <td>
                          <input
                            disabled={removed}
                            aria-label="有効"
                            type="checkbox"
                            checked={s.enabled}
                            onChange={(e) =>
                              update(s.id, { enabled: e.target.checked })
                            }
                          />
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-pressed={removed}
                            onClick={() => toggleDelete(s.id)}
                          >
                            {removed ? "削除を取り消す" : "削除"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length && (
                    <tr>
                      <td
                        colSpan={headers.length}
                        className="p-3 text-muted-foreground"
                      >
                        未登録
                      </td>
                    </tr>
                  )}
                  <tr className="border-t">
                    <td colSpan={headers.length} className="p-1 text-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`${title}スキルを追加`}
                        onClick={() => add(effects[0], damageType ?? undefined)}
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
      })}
    </div>
  );
}
