import { Shield, Sword } from "lucide-react";
import { useRef, useState } from "react";
import useSWR from "swr";
import type { Shop } from "./EconomyPanel";
import GameIcon from "./GameIcon";
import { gameRequest } from "./battle";
import type { GameSave } from "./domain";
import { equipmentSlots } from "./equipmentSlots";
import { type GameState, requestGameState } from "./state";

export default function EquipmentPanel({
  userId,
  save,
  revision,
  disabled,
  onSaved,
}: {
  userId: string;
  save: GameSave;
  revision: number;
  disabled: boolean;
  onSaved: (state: GameState) => void;
}) {
  const { data, error: loadError } = useSWR(["game-shop", userId], () =>
    gameRequest<Shop>("shop"),
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string>();
  const economy = save.economy;
  const equipped =
    economy?.equipment ??
    (economy?.weapon
      ? {
          arm1: {
            item_id: economy.weapon,
            max_uses: economy.weapon_max_uses ?? 30,
            defensive: false,
          },
        }
      : {});
  async function change(slot: string, itemId: string) {
    if (disabled || pending.current) return;
    const product = itemId || equipped[slot]?.item_id;
    if (!product) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      onSaved(
        await gameRequest<GameState>("inventory/equip", {
          revision,
          product_id: product,
          slot,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "装備を変更できませんでした。",
      );
      await requestGameState()
        .then(onSaved)
        .catch(() => undefined);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section aria-label="装備" className="space-y-4">
      {(error || loadError) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? loadError.message}
        </p>
      )}
      {!data && !loadError && <p>装備を読み込み中…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {equipmentSlots.map((slot) => {
          const current = equipped[slot.id];
          const product = data?.products.find(
            (item) => item.id === current?.item_id,
          );
          const candidates = (data?.products ?? []).filter(
            (item) =>
              item.kind === "weapon" &&
              item.enabled !== false &&
              (economy?.inventory[item.id] ?? 0) > 0 &&
              (item.equipment_part ??
                (item.category === "armor" ? "body" : "arm")) === slot.part,
          );
          const Icon = slot.part === "arm" ? Sword : Shield;
          return (
            <div
              key={slot.id}
              className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 ${current ? "border-primary/40 bg-primary/5" : "bg-muted/10"}`}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                {product ? (
                  <GameIcon icon={product.icon} className="size-7" />
                ) : (
                  <Icon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label
                  htmlFor={`equipment-${slot.id}`}
                  className="text-sm font-medium"
                >
                  {slot.label}
                </label>
                <select
                  id={`equipment-${slot.id}`}
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
                  value={current?.item_id ?? ""}
                  disabled={disabled || busy || !data}
                  onChange={(event) => void change(slot.id, event.target.value)}
                >
                  <option value="">未装備</option>
                  {current &&
                    !candidates.some((item) => item.id === current.item_id) && (
                      <option value={current.item_id}>
                        {product?.name ?? current.item_id}（装備中）
                      </option>
                    )}
                  {candidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {Object.entries(equipped).some(
                        ([id, value]) =>
                          id !== slot.id && value.item_id === item.id,
                      )
                        ? "（別枠から移動）"
                        : ""}
                    </option>
                  ))}
                </select>
                {current && (
                  <p className="text-xs text-muted-foreground">
                    {product?.skill_name && (
                      <span className="mr-2">{product.skill_name}</span>
                    )}
                    残り{" "}
                    {economy?.remaining_uses?.[current.item_id] ??
                      current.max_uses}
                    回
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
