import Dexie, { type Table } from "dexie";
import type {
  ResourceSearchResult,
  TanbunChain,
  TanbunSearchResult,
} from "~/shared/generated/fastAPI.schemas";
import type { HistoryItemType } from "../history/types";

// --- 共通の定義 ---
export interface CacheItem<T> {
  key: string;
  value: T;
  expires: number;
}
const TTL = 1000 * 60 * 60 * 24; // 24 hours
const HISTORY_MAX = 100;

class TanbunCacheDB extends Dexie {
  public cache!: Table<CacheItem<unknown>>;
  public knowdeDetails!: Table<TanbunChain>;
  public knowdeSearchResults!: Table<CacheItem<TanbunSearchResult>>;
  public resourceSearchResults!: Table<CacheItem<ResourceSearchResult>>;
  public history!: Table<HistoryItemType>;

  public constructor() {
    super("knowde-cache");
    this.version(2).stores({
      cache: "&key, expires",
      knowdeDetails: "&uid",
      knowdeSearchResults: "&key, expires",
      resourceSearchResults: "&key, expires",
      history: "++id, timestamp, url",
    });
  }
}

export const db = new TanbunCacheDB();

function createTTLStore<T>(table: Table<CacheItem<T>>) {
  async function cleanup() {
    const now = Date.now();
    await table.where("expires").below(now).delete();
  }

  return {
    async get(key: string): Promise<T | undefined> {
      const item = await table.get(key);
      if (item && item.expires > Date.now()) {
        return item.value;
      }
      if (item) await table.delete(key); // 期限切れを削除
      return undefined;
    },
    async set(key: string, value: T): Promise<void> {
      await table.put({ key, value, expires: Date.now() + TTL });
      await cleanup();
    },
    clear: () => table.clear(),
    count: () => table.count(),
  };
}

function createEntityStore<T>(table: Table<T>) {
  // Dexieのプライマリキーは string | number | Date | ArrayBuffer
  type KeyType = string | number;
  return {
    get: (id: KeyType) => table.get(id),
    set: (entity: T) => table.put(entity),
    delete: (id: KeyType) => table.delete(id),
    clear: () => table.clear(),
    count: () => table.count(),
  };
}

function createHistoryStore(table: Table<HistoryItemType>) {
  return {
    async add(item: Omit<HistoryItemType, "id" | "timestamp">): Promise<void> {
      const ignoredParams = ["tab"];
      const normalizeUrl = (urlStr: string) => {
        try {
          // URLコンストラクタが絶対URLを要求するため、ダミーのオリジンを渡す
          const url = new URL(urlStr, "http://localhost");
          const path = url.pathname;
          const params = new URLSearchParams(url.search);
          ignoredParams.forEach((param) => params.delete(param));
          params.sort();
          return `${path}?${params.toString()}`;
        } catch (e) {
          // 不正なURLがDBに保存されている場合などへのフォールバック
          return urlStr; // パース失敗時は元の文字列を返す
        }
      };

      const normalizedItemUrl = normalizeUrl(item.url);
      await table
        .filter((history) => {
          const normalizedHistoryUrl = normalizeUrl(history.url);
          return normalizedHistoryUrl === normalizedItemUrl;
        })
        .delete();
      await table.add({
        ...item,
        timestamp: Date.now(),
      });

      const count = await table.count();
      if (count > HISTORY_MAX) {
        const toDelete = await table
          .orderBy("timestamp")
          .limit(count - HISTORY_MAX)
          .toArray();
        const idsToDelete = toDelete
          .map((h) => h.id)
          .filter((id): id is number => id !== undefined);
        await table.bulkDelete(idsToDelete);
      }
    },
    getAll: () => table.orderBy("timestamp").reverse().toArray(),
    clear: () => table.clear(),
  };
}

// --- 具体的なキャッシュストアのインスタンス化 ---
export const genericCache = createTTLStore(db.cache);
export const tanbunSearchCache = createTTLStore<TanbunSearchResult>(
  db.knowdeSearchResults,
);
export const tanbunDetailCache = createEntityStore<TanbunChain>(
  db.knowdeDetails,
);

export const resourceSearchCache = createTTLStore<ResourceSearchResult>(
  db.resourceSearchResults,
);

export const historyCache = createHistoryStore(db.history);
