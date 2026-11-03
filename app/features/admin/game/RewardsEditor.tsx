import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AdminNativeTable,
  AdminTableFrame,
  AdminTableSection,
} from "~/features/admin/AdminTable";
import type { GameCatalog } from "~/features/game/catalog";
import {
  type GoldSettings,
  type RewardEntry,
  type RewardSettings,
  type RewardTable,
  defaultGoldSettings,
} from "~/features/game/rewards";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import GoldPreview from "./GoldPreview";
import {
  type GameSettingsDocument,
  exportGameSettings,
  previewGameSettings,
  saveGameSettings,
} from "./gameSettingsFiles";

type FixedRewards = {
  chest_healing_potions: number;
  chest_step_potions: number;
};
const selectClass = "h-9 rounded-md border bg-background px-2 text-sm";
const tierName = (tier: number) =>
  ["初級", "中級", "上級"][tier - 1] ?? `第${tier}段階`;

function NumberField({
  label,
  value,
  onChange,
  max,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
  min?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input
        id={id}
        aria-label={label}
        type="number"
        required
        value={value}
        min={min}
        max={max}
        step={step}
        className="w-28"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function GoldEditor({
  value,
  onChange,
}: { value: GoldSettings; onChange: (value: GoldSettings) => void }) {
  const number = (
    key: Exclude<keyof GoldSettings, "power_formula">,
    label: string,
    max: number,
    min = 0,
    step = 1,
  ) => (
    <NumberField
      label={label}
      value={value[key]}
      max={max}
      min={min}
      step={step}
      onChange={(next) => onChange({ ...value, [key]: next })}
    />
  );
  return (
    <AdminTableSection
      title="Gold（共通計算）"
      className="mx-0 w-full space-y-4"
      aria-label="Goldの共通計算"
    >
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <span className="pb-2">Gold = (</span>
        {number("base", "基本Gold", 100000)}
        <span className="pb-2">+</span>
        {number("power_coefficient", "Power補正", 100000, 0, 0.1)}
        <span className="pb-2">×</span>
        <label className="flex flex-col gap-1">
          Powerの計算
          <select
            aria-label="GoldのPower計算"
            className={selectClass}
            value={value.power_formula}
            onChange={(event) =>
              onChange({
                ...value,
                power_formula: event.target
                  .value as GoldSettings["power_formula"],
              })
            }
          >
            <option value="sqrt">√(Power / 基準Power)</option>
            <option value="log">log(1 + Power / 基準Power)</option>
          </select>
        </label>
        {number("power_reference", "基準Power", 1000000000, 0.01, 0.01)}
        <span className="pb-2">) × [1 + (達成度 − 1) ×</span>
        {number("achievement_growth_percent", "達成度成長率 (%)", 1000)}
        <span className="pb-2">%] × (1 ±</span>
        {number("variance_percent", "バラツキ (%)", 50)}
        <span className="pb-2">%) × 倍率</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {number("enemy_multiplier", "敵ドロップの倍率", 100, 0, 0.1)}
        {number("chest_multiplier", "宝箱の倍率", 100, 0, 0.1)}
      </div>
      <p className="text-sm text-muted-foreground">
        敵1体・宝箱1個あたり。達成度は最低1として計算し、最後に小数点以下を切り捨てます。アイテム候補とは独立した設定です。
      </p>
    </AdminTableSection>
  );
}

function RewardTableEditor({
  table,
  catalog,
  onChange,
  onDelete,
}: {
  table: RewardTable;
  catalog: GameCatalog;
  onChange: (table: RewardTable) => void;
  onDelete: () => void;
}) {
  const patch = (value: Partial<RewardTable>) =>
    onChange({ ...table, ...value });
  function entryChange(index: number, value: Partial<RewardEntry>) {
    patch({
      entries: table.entries.map((entry, current) =>
        current === index ? { ...entry, ...value } : entry,
      ),
    });
  }
  return (
    <AdminTableSection
      title={table.name}
      className="space-y-4"
      aria-label={table.name}
    >
      <div className="flex items-end gap-3">
        <label htmlFor={`${table.id}-name`} className="space-y-1 text-sm">
          <span className="block text-muted-foreground">名前</span>
          <Input
            id={`${table.id}-name`}
            aria-label="候補セットの名前"
            value={table.name}
            required
            maxLength={80}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          aria-label="候補セットを削除"
          onClick={onDelete}
        >
          ×
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <NumberField
          label="段階が上がる達成度間隔"
          value={table.tier_interval}
          min={1}
          max={1000}
          onChange={(tier_interval) => patch({ tier_interval })}
        />
        <NumberField
          label="抽選回数"
          value={table.draws}
          max={10}
          onChange={(draws) => patch({ draws })}
        />
        <NumberField
          label="1回ごとの入手率 (%)"
          value={table.item_chance}
          max={100}
          onChange={(item_chance) => patch({ item_chance })}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        達成度0〜{table.tier_interval - 1}: 初級、{table.tier_interval}〜
        {table.tier_interval * 2 - 1}: 中級、{table.tier_interval * 2}〜:
        上級。利用可能な最上位の段階から重みで抽選します。
      </p>
      <AdminTableFrame layout="content">
        <AdminNativeTable
          layout="content"
          aria-label={`${table.name}の候補`}
          className="text-sm whitespace-nowrap"
        >
          <thead>
            <tr>
              {["アイテム", "段階", "重み", "個数", "削除"].map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.entries.map((entry, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: controlled rows have no persistent IDs and cannot be reordered.
              <tr key={index}>
                <td>
                  <select
                    aria-label="アイテム"
                    className={`${selectClass} max-w-64`}
                    value={entry.item_id}
                    onChange={(event) =>
                      entryChange(index, { item_id: event.target.value })
                    }
                  >
                    {catalog.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {!item.enabled ||
                        !catalog.skills.some(
                          (skill) =>
                            skill.id === item.skill_id && skill.enabled,
                        )
                          ? "（無効）"
                          : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="段階"
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={entry.tier}
                      className="w-20"
                      onChange={(event) =>
                        entryChange(index, { tier: Number(event.target.value) })
                      }
                    />
                    <span>{tierName(entry.tier)}</span>
                  </div>
                </td>
                <td>
                  <Input
                    aria-label="重み"
                    type="number"
                    required
                    min={1}
                    max={10000}
                    value={entry.weight}
                    className="w-20"
                    onChange={(event) =>
                      entryChange(index, { weight: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <Input
                    aria-label="個数"
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={entry.quantity}
                    className="w-20"
                    onChange={(event) =>
                      entryChange(index, {
                        quantity: Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="候補を削除"
                    onClick={() =>
                      patch({
                        entries: table.entries.filter(
                          (_, current) => current !== index,
                        ),
                      })
                    }
                  >
                    ×
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  aria-label="候補を追加"
                  disabled={
                    !catalog.items.length || table.entries.length >= 200
                  }
                  onClick={() => {
                    const item = catalog.items[0];
                    if (!item) return;
                    const tier =
                      1 +
                      Math.max(
                        0,
                        ...table.entries
                          .filter((entry) => entry.item_id === item.id)
                          .map((entry) => entry.tier),
                      );
                    patch({
                      entries: [
                        ...table.entries,
                        { item_id: item.id, tier, weight: 1, quantity: 1 },
                      ],
                    });
                  }}
                >
                  ＋
                </Button>
              </td>
            </tr>
          </tfoot>
        </AdminNativeTable>
      </AdminTableFrame>
    </AdminTableSection>
  );
}

export default function RewardsEditor() {
  const [catalog, setCatalog] = useState<GameCatalog>();
  const [rewards, setRewards] = useState<RewardSettings>({
    tables: [],
    chest_table_id: null,
  });
  const [fixed, setFixed] = useState<FixedRewards>({
    chest_healing_potions: 0,
    chest_step_potions: 1,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const apply = useCallback((document: GameSettingsDocument) => {
    const loaded = document.catalog as GameCatalog;
    setCatalog(loaded);
    setRewards({
      ...(loaded.rewards ?? { tables: [], chest_table_id: null }),
      gold: { ...defaultGoldSettings, ...loaded.rewards?.gold },
    });
    const balance = document.balance ?? {};
    setFixed({
      chest_healing_potions: Number(balance.chest_healing_potions ?? 0),
      chest_step_potions: Number(balance.chest_step_potions ?? 1),
    });
  }, []);
  const load = useCallback(async () => {
    setError("");
    try {
      apply(await exportGameSettings());
    } catch (reason) {
      setError(String(reason));
    }
  }, [apply]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!catalog)
    return (
      <div className="p-6 text-center">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button onClick={load}>再読込</Button>
          </>
        ) : (
          "読み込み中…"
        )}
      </div>
    );
  return (
    <div className="space-y-6">
      <GoldPreview settings={rewards.gold ?? defaultGoldSettings} />
      <form
        className="space-y-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const preview = await previewGameSettings({
              format: "tanbunism.game-settings",
              version: 1,
              catalog: { rewards },
              balance: fixed,
            });
            apply(await saveGameSettings(preview));
            setMessage("保存しました。未開封の宝箱から反映されます。");
          } catch (reason) {
            setError(String(reason));
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="min-w-0 space-y-8">
          <GoldEditor
            value={rewards.gold ?? defaultGoldSettings}
            onChange={(gold) => setRewards({ ...rewards, gold })}
          />
          <AdminTableSection title="宝箱" className="mx-0 w-full space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              アイテムのドロップ候補
              <select
                aria-label="宝箱のドロップ候補"
                className={selectClass}
                value={rewards.chest_table_id ?? ""}
                onChange={(event) =>
                  setRewards({
                    ...rewards,
                    chest_table_id: event.target.value || null,
                  })
                }
              >
                <option value="">なし（共通追加のみ）</option>
                {rewards.tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <NumberField
                label="共通追加: 回復薬"
                value={fixed.chest_healing_potions}
                max={100}
                onChange={(chest_healing_potions) =>
                  setFixed({ ...fixed, chest_healing_potions })
                }
              />
              <NumberField
                label="共通追加: 歩数回復薬"
                value={fixed.chest_step_potions}
                max={100}
                onChange={(chest_step_potions) =>
                  setFixed({ ...fixed, chest_step_potions })
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              各領域の最後に1箱。開封済みの内容は変わりません。無効なアイテム・スキルは抽選対象外です。
            </p>
          </AdminTableSection>
          {rewards.tables.map((table) => (
            <RewardTableEditor
              key={table.id}
              table={table}
              catalog={catalog}
              onChange={(value) =>
                setRewards({
                  ...rewards,
                  tables: rewards.tables.map((current) =>
                    current.id === table.id ? value : current,
                  ),
                })
              }
              onDelete={() =>
                setRewards({
                  ...rewards,
                  chest_table_id:
                    rewards.chest_table_id === table.id
                      ? null
                      : rewards.chest_table_id,
                  tables: rewards.tables.filter(
                    (current) => current.id !== table.id,
                  ),
                })
              }
            />
          ))}
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              disabled={rewards.tables.length >= 100}
              onClick={() => {
                const table: RewardTable = {
                  id: `reward_${crypto.randomUUID().replaceAll("-", "")}`,
                  name: "新しいドロップ候補",
                  tier_interval: 5,
                  draws: 1,
                  item_chance: 100,
                  entries: [],
                };
                setRewards({
                  ...rewards,
                  tables: [...rewards.tables, table],
                  chest_table_id: rewards.chest_table_id ?? table.id,
                });
              }}
            >
              ＋ ドロップ候補
            </Button>
          </div>
          <div className="text-center">
            <Button type="submit">{busy ? "保存中…" : "保存"}</Button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-center text-destructive">
            {error}
          </p>
        )}
        {message && <output className="block text-center">{message}</output>}
      </form>
    </div>
  );
}
