import { Plus, X } from "lucide-react";
import {
  type GameCatalog,
  type SkillDefinition,
  type SkillPatch,
  defaultElements,
  normalizeSkill,
  resolveCatalogTemplates,
  skillTemplate,
} from "~/features/game/catalog";
import {
  templateOverrideFields,
  templatePowerFields,
} from "~/features/game/templateVariants";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import RowOrder from "./RowOrder";
import { SortableRow, SortableRows } from "./SortableRows";
import TemplateVariantControls from "./TemplateVariantControls";
import {
  changeDetail,
  changeKind,
  changeResource,
  changeStateDetail,
  effectPatch,
  effectValue,
  instantResource,
  isStatus,
  stateDetail,
  stateResource,
  templateKind,
} from "./templateEffects";
import useTableSort from "./useTableSort";

const selectClass = "h-9 rounded-md border bg-background px-2";
const columns = [
  ["order", "番号"],
  ["name", "名前"],
  ["target_count", "対象数"],
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
  const elements = catalog.elements ?? defaultElements;
  function toTemplate(skill: SkillDefinition) {
    return skillTemplate(
      skill,
      templates.find((row) => row.id === skill.id),
    );
  }
  function commit(next: typeof templates) {
    onChange(resolveCatalogTemplates({ ...catalog, skill_templates: next }));
  }
  function resetOverride(id: string, fields: readonly string[]) {
    commit(
      templates.map((row) =>
        row.id === id
          ? {
              ...row,
              override_fields: row.override_fields?.filter(
                (key) => !fields.includes(key),
              ),
            }
          : row,
      ),
    );
  }
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
  const { sorted, header, resetSort } = useTableSort(rows, (skill, column) => {
    if (column === "order") return rows.findIndex((row) => row.id === skill.id);
    if (column === "type") return skill.on_wrong?.type ?? "fizzle";
    if (column === "kind") return templateKind(skill);
    if (column === "detail")
      return isStatus(skill)
        ? `${skill.effect}:${skill.stat ?? skill.ailment}`
        : skill.effect;
    if (column === "power") return effectValue(skill).value;
    const value = skill[column as keyof SkillDefinition];
    return typeof value === "string" || typeof value === "number" ? value : "";
  });
  function update(id: string, patch: SkillPatch) {
    commit(
      rows.map((skill) => {
        const source = toTemplate(skill);
        const result = skillTemplate(
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
        );
        return {
          ...result,
          ...(source.base_template_id
            ? {
                base_template_id: source.base_template_id,
                override_fields: [
                  ...new Set([
                    ...(source.override_fields ?? []),
                    ...(skill.id === id
                      ? templateOverrideFields.filter((key) => key in patch)
                      : []),
                  ]),
                ],
              }
            : {}),
        };
      }),
    );
  }
  return (
    <section aria-label="効果テンプレート" className="space-y-2">
      <h3 className="font-semibold">効果テンプレート</h3>
      <p className="text-xs text-muted-foreground">
        回復・ダメージは詳細で指定します。回復の倍率は最大値を基準にします。状態の効果は継続する行動数です。属性威力はその属性で攻撃する強さ、属性耐性はその属性のダメージを軽減する強さです。バフで上昇、デバフで低下します。保存で確定します。
      </p>
      <p className="text-xs text-muted-foreground">
        共通設定から対象数別のバリエーションを一括作成できます。子の対象数・効果を編集すると上書き（色付き）になり、↶で共通値に戻せます。種別・詳細・タイプは共通設定で編集します。継承は1段のみです。
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <SortableRows
          rows={sorted}
          onReorder={(rows) => {
            commit(rows.map(toTemplate));
            resetSort();
          }}
        >
          <table
            aria-label="効果テンプレート一覧"
            className="w-full whitespace-nowrap text-sm"
          >
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>{columns.map(([key, label]) => header(key, label))}</tr>
            </thead>
            <tbody>
              {sorted.map((skill, index) => {
                const status = isStatus(skill);
                const kind = templateKind(skill);
                const utility = kind === "other";
                const normal = catalog.skills.some(
                  (s) =>
                    s.id === "normal_attack" &&
                    s.template_ids?.includes(skill.id),
                );
                const users = catalog.skills.filter((s) =>
                  s.template_ids?.includes(skill.id),
                );
                const source = templates.find((row) => row.id === skill.id);
                const variant = Boolean(source?.base_template_id);
                const dependents = templates.filter(
                  (row) => row.base_template_id === skill.id,
                );
                const scopeOverride =
                  variant && source?.override_fields?.includes("target_count");
                const powerOverride =
                  variant &&
                  source?.override_fields?.some((key) =>
                    templatePowerFields.includes(key),
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
                      value={
                        Number.isFinite(skill[key] ?? fallback)
                          ? (skill[key] ?? fallback)
                          : ""
                      }
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
                  <SortableRow
                    id={skill.id}
                    key={skill.id}
                    aria-label={skill.name}
                    className="border-t [&>td]:p-2"
                  >
                    <td>
                      <RowOrder index={index} />
                    </td>
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
                      {source && (
                        <TemplateVariantControls
                          template={source}
                          catalog={catalog}
                          onChange={onChange}
                          locked={normal}
                        />
                      )}
                    </td>
                    <td
                      className={scopeOverride ? "bg-amber-500/10" : undefined}
                    >
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
                      {scopeOverride && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="対象数を共通設定に戻す"
                          onClick={() =>
                            resetOverride(skill.id, ["target_count"])
                          }
                        >
                          ↶
                        </Button>
                      )}
                    </td>
                    <td>
                      <fieldset disabled={variant}>
                        <select
                          aria-label="種別"
                          className={selectClass}
                          disabled={normal}
                          value={kind}
                          onChange={(e) =>
                            update(skill.id, changeKind(skill, e.target.value))
                          }
                        >
                          <option value="physical">物理</option>
                          <option value="special">特殊</option>
                          <option value="status">状態</option>
                          <option value="other">その他</option>
                        </select>
                      </fieldset>
                    </td>
                    <td>
                      <fieldset disabled={variant}>
                        {status ? (
                          <div className="flex items-center gap-1">
                            <select
                              aria-label="詳細"
                              className={selectClass}
                              value={stateDetail(skill)}
                              onChange={(e) =>
                                update(
                                  skill.id,
                                  changeStateDetail(skill, e.target.value),
                                )
                              }
                            >
                              <option value="recovery">回復</option>
                              <option value="damage">ダメージ</option>
                              <option value="buff">バフ</option>
                              <option value="debuff">デバフ</option>
                            </select>
                            {
                              <select
                                aria-label="対象ステータス"
                                className={selectClass}
                                value={stateResource(skill)}
                                onChange={(e) => {
                                  const patch = changeStateDetail(
                                    skill,
                                    stateDetail(skill),
                                    e.target.value,
                                  );
                                  if (
                                    ["damageDealt", "damageTaken"].includes(
                                      e.target.value,
                                    ) &&
                                    !elements.some(
                                      (element) =>
                                        element.id === patch.affected_element,
                                    )
                                  )
                                    patch.affected_element =
                                      elements.find(
                                        (element) => element.enabled,
                                      )?.id ?? "";
                                  update(skill.id, patch);
                                }}
                              >
                                {Object.entries(
                                  skill.effect === "ailment"
                                    ? { hp: "HP", mp: "MP" }
                                    : {
                                        attack: "攻撃力",
                                        defense: "守備力",
                                        specialAttack: "特攻",
                                        specialDefense: "特守",
                                        damageDealt: "属性威力",
                                        damageTaken: "属性耐性",
                                        ...(skill.effect === "buff"
                                          ? { maxHp: "最大HP（バブル）" }
                                          : {}),
                                      },
                                ).map(([v, label]) => (
                                  <option key={v} value={v}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            }
                            {["damageDealt", "damageTaken"].includes(
                              skill.stat ?? "",
                            ) && (
                              <select
                                aria-label="補正対象属性"
                                className={selectClass}
                                required
                                value={skill.affected_element ?? ""}
                                onChange={(event) =>
                                  update(skill.id, {
                                    affected_element: event.target.value,
                                  })
                                }
                              >
                                <option value="" disabled>
                                  属性を選択
                                </option>
                                {elements
                                  .filter(
                                    (element) =>
                                      element.enabled ||
                                      element.id === skill.affected_element,
                                  )
                                  .map((element) => (
                                    <option key={element.id} value={element.id}>
                                      {element.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                            <select
                              aria-label="状態の値の指定"
                              className={selectClass}
                              value={skill.amount_mode ?? "fixed"}
                              disabled={[
                                "maxHp",
                                "damageDealt",
                                "damageTaken",
                              ].includes(skill.stat ?? "")}
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
                          <select
                            aria-label="詳細"
                            className={selectClass}
                            value="moves"
                            disabled
                          >
                            <option value="moves">歩数</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <select
                              aria-label="対象ステータス"
                              className={selectClass}
                              value={instantResource(skill)}
                              disabled={normal}
                              onChange={(e) =>
                                update(
                                  skill.id,
                                  changeResource(skill, e.target.value),
                                )
                              }
                            >
                              <option value="hp">HP</option>
                              <option value="mp">MP</option>
                            </select>
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
                                  changeDetail(
                                    skill,
                                    e.target.value === "recovery",
                                  ),
                                )
                              }
                            >
                              <option value="damage">ダメージ</option>
                              <option value="recovery">回復</option>
                            </select>
                          </div>
                        )}
                      </fieldset>
                    </td>
                    <td>
                      <fieldset disabled={variant}>
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
                                          ? Math.floor(
                                              effectValue(skill).value / 2,
                                            )
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
                      </fieldset>
                    </td>
                    <td
                      className={powerOverride ? "bg-amber-500/10" : undefined}
                    >
                      <div className="flex items-center gap-2">
                        {power()}
                        {reduced && power(true)}
                        {powerOverride && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="効果を共通設定に戻す"
                            onClick={() =>
                              resetOverride(skill.id, templatePowerFields)
                            }
                          >
                            ↶
                          </Button>
                        )}
                      </div>
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="削除"
                        disabled={users.length > 0 || dependents.length > 0}
                        title={
                          dependents.length
                            ? `使用中: ${dependents.map((row) => row.name).join("、")}`
                            : users.length
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
                        <X aria-hidden="true" className="size-4" />
                      </Button>
                    </td>
                  </SortableRow>
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
        </SortableRows>
      </div>
    </section>
  );
}
