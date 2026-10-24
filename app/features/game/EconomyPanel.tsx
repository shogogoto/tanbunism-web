import { Coins, Footprints, Heart, Sword } from "lucide-react";
import { useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "~/shared/components/ui/button";
import GameIcon from "./GameIcon";
import { gameRequest } from "./battle";
import type { GameSave } from "./domain";
import { type GameState, requestGameState } from "./state";

type Product = {
  id: string;
  name: string;
  price: number | null;
  kind: "weapon" | "hp" | "mp" | "moves" | "skill" | "dungeon_unlock";
  resource_id?: string | null;
  amount: number;
  amount_mode?: "fixed" | "percent";
  icon?: string;
  skill_name?: string;
  enabled?: boolean;
  max_uses?: number;
  element_names?: Record<string, string>;
  equipment_buffs?: {
    stat: string;
    amount: number;
    amount_mode: "fixed" | "percent";
    affected_element?: string | null;
  }[];
};
type Shop = {
  products: Product[];
  specialties?: {
    resource_id: string;
    name: string;
    level: number;
    quiz_count: number;
  }[];
};

export default function EconomyPanel({
  userId,
  save,
  revision,
  shop,
  disabled,
  onSaved,
  onTab,
}: {
  userId: string;
  save: GameSave;
  revision: number;
  shop: boolean;
  disabled: boolean;
  onSaved: (state: GameState) => void;
  onTab: (panel: "shop" | "item") => void;
}) {
  const {
    data,
    error: loadError,
    mutate,
  } = useSWR(["game-shop", userId], () => gameRequest<Shop>("shop"), {
    revalidateOnFocus: true,
  });
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const inventory = save.economy?.inventory ?? {};
  async function act(product: Product, action: "buy" | "equip" | "use") {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      onSaved(
        await gameRequest<GameState>(
          action === "buy" ? "shop/buy" : `inventory/${action}`,
          {
            revision,
            product_id: product.id,
          },
        ),
      );
      if (product.kind === "dungeon_unlock")
        setMessage("ダンジョンを開放しました。入り口から移動できます。");
      void mutate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "操作できませんでした。",
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={shop ? "outline" : "default"}
            onClick={() => onTab("item")}
          >
            所持品
          </Button>
          <Button
            variant={shop ? "default" : "outline"}
            onClick={() => onTab("shop")}
          >
            ショップ
          </Button>
        </div>
        <span className="flex items-center gap-1 text-amber-400 tabular-nums">
          <Coins className="size-4" />
          {save.economy?.gold ?? 0} G
        </span>
      </div>
      {(error || loadError) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? loadError.message}
        </p>
      )}
      {message && <output className="block text-sm">{message}</output>}
      {!data && !loadError && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}
      {data?.products
        .filter((product) =>
          shop ? product.price !== null : (inventory[product.id] ?? 0) > 0,
        )
        .map((product) => {
          const quantity = inventory[product.id] ?? 0;
          const equipped = save.economy?.weapon === product.id;
          const maxUses =
            product.max_uses ?? (product.kind === "weapon" ? 30 : 1);
          const Icon =
            product.kind === "weapon"
              ? Sword
              : product.kind === "hp"
                ? Heart
                : Footprints;
          const unavailable =
            (product.enabled === false && !equipped) ||
            (shop
              ? (save.economy?.gold ?? 0) < (product.price ?? 0) ||
                (product.kind === "weapon" && quantity > 0)
              : (!save.run &&
                  product.kind !== "weapon" &&
                  product.kind !== "dungeon_unlock") ||
                (product.kind === "hp" && save.run?.hp === save.run?.maxHp) ||
                (product.kind === "mp" && save.run?.mp === save.run?.maxMp) ||
                product.kind === "skill" ||
                (product.kind === "moves" && save.run?.moves === 0));
          return (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {product.icon ? (
                <GameIcon icon={product.icon} className="size-5 shrink-0" />
              ) : (
                <Icon className="size-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">
                  {product.name}
                  {!shop && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      ×{quantity}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {product.kind === "dungeon_unlock"
                    ? "指定リソースのダンジョンを開放"
                    : product.kind === "weapon"
                      ? product.equipment_buffs?.length
                        ? product.equipment_buffs
                            .map(
                              (buff) =>
                                `${buff.affected_element ? `${product.element_names?.[buff.affected_element] ?? buff.affected_element} ` : ""}${({ attack: "攻", defense: "守", specialAttack: "特攻", specialDefense: "特守", maxHp: "最大HP", damageDealt: "与ダメージ", damageTaken: "被ダメージ" } as Record<string, string>)[buff.stat] ?? buff.stat} ${buff.stat === "damageTaken" ? "-" : "+"}${buff.amount}${buff.amount_mode === "percent" ? "%" : ""}`,
                            )
                            .join(" · ")
                        : `攻 +${product.amount}`
                      : product.kind === "hp"
                        ? `HP ${product.amount}${product.amount_mode === "percent" ? "%" : ""}回復`
                        : product.kind === "mp"
                          ? `MP ${product.amount}${product.amount_mode === "percent" ? "%" : ""}回復`
                          : product.kind === "skill"
                            ? `${product.skill_name ?? "スキル"} · 戦闘のガンビットで使用`
                            : `${product.amount}歩回復`}
                  {equipped && " · 装備中"}
                  {shop
                    ? ` · ${maxUses}回使用可`
                    : ` · 残り ${Math.min(save.economy?.remaining_uses?.[product.id] ?? maxUses, maxUses)}/${maxUses}回`}
                </p>
              </div>
              <Button
                disabled={disabled || busy || unavailable}
                variant="outline"
                onClick={() =>
                  void act(
                    product,
                    shop ? "buy" : product.kind === "weapon" ? "equip" : "use",
                  )
                }
              >
                {shop
                  ? product.kind === "weapon" && quantity > 0
                    ? "所持済み"
                    : `${product.price} G`
                  : product.kind === "weapon"
                    ? equipped
                      ? "外す"
                      : "装備"
                    : product.kind === "dungeon_unlock"
                      ? product.enabled === false
                        ? "開放済み"
                        : "開放する"
                      : "使う"}
              </Button>
            </div>
          );
        })}
      {!shop && data && !Object.values(inventory).some((n) => n > 0) && (
        <p className="text-sm text-muted-foreground">
          まだアイテムを持っていません。
        </p>
      )}
      {disabled && (
        <p className="text-sm text-muted-foreground">
          戦闘が終わってから操作できます。
        </p>
      )}
    </div>
  );
}
