import { AdminNativeTable, AdminTableFrame } from "~/features/admin/AdminTable";
import GameIcon from "~/features/game/GameIcon";
import type { GameCatalog, ShopListing } from "~/features/game/catalog";
import { shopProductId } from "~/features/game/gambitShop";
import { triggerTargets } from "~/features/game/triggerVariants";
import { Input } from "~/shared/components/ui/input";

export default function ShopTable({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (shop: ShopListing[]) => void }) {
  const shop = catalog.shop ?? [];
  function update(id: string, patch: Partial<ShopListing>) {
    const current = shop.find((p) => shopProductId(p) === id);
    onChange(
      current
        ? shop.map((p) =>
            shopProductId(p) === id ? ({ ...p, ...patch } as ShopListing) : p,
          )
        : [
            ...shop,
            {
              ...(id.startsWith("gambit:")
                ? { trigger_id: id.slice(7) }
                : { item_id: id }),
              price: 0,
              enabled: true,
              ...patch,
            } as ShopListing,
          ],
    );
  }
  const products = [
    ...catalog.items.map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      enabled: item.enabled,
      detail: catalog.skills.find((s) => s.id === item.skill_id)?.name ?? "—",
    })),
    ...(catalog.triggers ?? []).map((trigger) => ({
      id: `gambit:${trigger.id}`,
      name: trigger.name,
      icon: "target",
      enabled: trigger.enabled,
      detail: `ガンビット · ${triggerTargets[trigger.target ?? "enemy"]}`,
    })),
  ];
  return (
    <AdminTableFrame layout="content">
      <AdminNativeTable
        layout="content"
        className="whitespace-nowrap text-sm"
        aria-label="ショップ販売設定"
      >
        <thead className="bg-muted/40">
          <tr>
            {["アイテム", "内容", "販売", "価格（G）"].map((h) => (
              <th key={h} scope="col" className="p-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((item) => {
            const listing = shop.find((p) => shopProductId(p) === item.id);
            return (
              <tr
                key={item.id}
                aria-label={item.name}
                className="border-t [&>td]:p-2"
              >
                <td>
                  <span className="inline-flex items-center gap-2">
                    <GameIcon icon={item.icon} className="size-5" />
                    {item.name}
                    {!item.enabled && "（無効）"}
                  </span>
                </td>
                <td>{item.detail}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label="販売"
                    checked={listing?.enabled ?? false}
                    onChange={(e) =>
                      update(item.id, { enabled: e.target.checked })
                    }
                  />
                </td>
                <td>
                  <Input
                    aria-label="価格（G）"
                    className="w-28"
                    type="number"
                    min={0}
                    max={1000000}
                    required
                    disabled={!listing?.enabled}
                    value={
                      listing
                        ? Number.isFinite(listing.price)
                          ? listing.price
                          : ""
                        : ""
                    }
                    onChange={(e) =>
                      update(item.id, { price: e.target.valueAsNumber })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </AdminNativeTable>
      {!products.length && (
        <p className="p-3 text-sm text-muted-foreground">
          アイテムを先に定義してください。
        </p>
      )}
    </AdminTableFrame>
  );
}
