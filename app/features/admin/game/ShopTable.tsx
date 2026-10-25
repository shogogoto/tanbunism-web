import { AdminNativeTable, AdminTableFrame } from "~/features/admin/AdminTable";
import GameIcon from "~/features/game/GameIcon";
import type { GameCatalog, ShopListing } from "~/features/game/catalog";
import { Input } from "~/shared/components/ui/input";

export default function ShopTable({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (shop: ShopListing[]) => void }) {
  const shop = catalog.shop ?? [];
  function update(id: string, patch: Partial<ShopListing>) {
    const current = shop.find((p) => p.item_id === id);
    onChange(
      current
        ? shop.map((p) => (p.item_id === id ? { ...p, ...patch } : p))
        : [...shop, { item_id: id, price: 0, enabled: true, ...patch }],
    );
  }
  return (
    <AdminTableFrame layout="content">
      <AdminNativeTable
        layout="content"
        className="whitespace-nowrap text-sm"
        aria-label="ショップ販売設定"
      >
        <thead className="bg-muted/40">
          <tr>
            {["アイテム", "発動スキル", "販売", "価格（G）"].map((h) => (
              <th key={h} scope="col" className="p-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {catalog.items.map((item) => {
            const listing = shop.find((p) => p.item_id === item.id);
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
                <td>
                  {catalog.skills.find((s) => s.id === item.skill_id)?.name}
                </td>
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
      {!catalog.items.length && (
        <p className="p-3 text-sm text-muted-foreground">
          アイテムを先に定義してください。
        </p>
      )}
    </AdminTableFrame>
  );
}
