"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { tanbunDetailCache } from "~/shared/lib/indexed"; // tanbunDetailCache の代わりに db をインポート

export function CacheInfo() {
  const count = useLiveQuery(() => tanbunDetailCache.count());

  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-md shadow-lg text-sm">
      Cached Tanbun details: {count ?? "..."}
    </div>
  );
}
