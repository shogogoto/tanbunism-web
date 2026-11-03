import GameIcon from "~/features/game/GameIcon";
import type { GameCatalog, ShopListing } from "~/features/game/catalog";
import { shopProductId } from "~/features/game/gambitShop";
import {
  triggerTargets,
  triggerVariant,
} from "~/features/game/triggerVariants";
import { Input } from "~/shared/components/ui/input";
import SortableAdminTable from "./SortableAdminTable";
import { RowDragHandle, SortableRow } from "./SortableRows";

export default function ShopTable({
  catalog,
  onChange,
}: { catalog: GameCatalog; onChange: (shop: ShopListing[]) => void }) {
  const shop = catalog.shop ?? [];
  function update(product: ShopListing, patch: Partial<ShopListing>) {
    const id = shopProductId(product);
    const current = shop.find((p) => shopProductId(p) === id);
    onChange(
      current
        ? shop.map((p) =>
            shopProductId(p) === id ? ({ ...p, ...patch } as ShopListing) : p,
          )
        : [
            ...shop,
            {
              ...product,
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
      listing: { item_id: item.id, price: 0, enabled: true },
    })),
    ...(catalog.triggers ?? []).flatMap((trigger) =>
      [null, ...(trigger.variants ?? [])].map((variant) => {
        const listing = {
          trigger_id: trigger.id,
          ...(variant ? { trigger_variant_id: variant.id } : {}),
          price: 0,
          enabled: true,
        };
        const resolved = triggerVariant(trigger, variant?.id);
        return {
          id: shopProductId(listing),
          name: variant
            ? `${trigger.name}（${variant.resolved_name ?? variant.name}）`
            : trigger.name,
          icon: "target",
          enabled: trigger.enabled,
          detail: `ガンビット · ${triggerTargets[resolved?.target ?? "enemy"]}`,
          listing,
        };
      }),
    ),
  ];
  const positions = new Map(
    shop.map((listing, index) => [shopProductId(listing), index]),
  );
  products.sort(
    (a, b) =>
      (positions.get(a.id) ?? shop.length) -
      (positions.get(b.id) ?? shop.length),
  );
  return (
    <SortableAdminTable
      rows={products}
      value={(item, column) => {
        const listing = shop.find((entry) => shopProductId(entry) === item.id);
        if (column === "アイテム") return item.name;
        if (column === "内容") return item.detail;
        if (column === "販売") return Number(listing?.enabled ?? false);
        return listing?.price ?? -1;
      }}
      onReorder={(rows) =>
        onChange([
          ...rows.map(
            (item) =>
              shop.find((listing) => shopProductId(listing) === item.id) ?? {
                ...item.listing,
                enabled: false,
              },
          ),
          ...shop.filter(
            (listing) =>
              !products.some((item) => item.id === shopProductId(listing)),
          ),
        ])
      }
      className="whitespace-nowrap text-sm"
      aria-label="ショップ販売設定"
    >
      {({ sorted, header }) => (
        <>
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="w-8">
                <span className="sr-only">並べ替え</span>
              </th>
              {["アイテム", "内容", "販売", "価格（G）"].map((h) =>
                header(h, h),
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const listing = shop.find((p) => shopProductId(p) === item.id);
              return (
                <SortableRow
                  id={item.id}
                  key={item.id}
                  aria-label={item.name}
                  className="border-t [&>td]:p-2"
                >
                  <td>
                    <RowDragHandle />
                  </td>
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
                        update(item.listing, { enabled: e.target.checked })
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
                        update(item.listing, { price: e.target.valueAsNumber })
                      }
                    />
                  </td>
                </SortableRow>
              );
            })}
          </tbody>
          {!products.length && (
            <tfoot>
              <tr>
                <td colSpan={5}>
                  <p className="p-3 text-sm text-muted-foreground">
                    アイテムを先に定義してください。
                  </p>
                </td>
              </tr>
            </tfoot>
          )}
        </>
      )}
    </SortableAdminTable>
  );
}
