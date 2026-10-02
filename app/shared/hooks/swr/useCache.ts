import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { type Key, type SWRConfiguration, type SWRResponse } from "swr";

export function createCacheKey<TParams extends object>(
  prefix: string,
  params: TParams,
) {
  const sortedParams = Object.fromEntries(Object.entries(params).sort());
  return `${prefix}-${JSON.stringify(sortedParams)}`;
}

export function usePersistentFallback<TData>(
  cacheKey: string,
  getCache: (key: string) => Promise<TData | undefined>,
) {
  const [cached, setCached] = useState<{
    key: string;
    data: TData;
  }>();

  useEffect(() => {
    let isMounted = true;
    async function loadCache() {
      const cachedData = await getCache(cacheKey);
      if (isMounted && cachedData) {
        setCached({ key: cacheKey, data: cachedData });
      }
    }
    loadCache();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, getCache]);

  return cached?.key === cacheKey ? cached.data : undefined;
}

export function useCachedSWR<TData, TResponse>(
  cacheKey: string,
  getCache: (key: string) => Promise<TData | undefined>,
) {
  const cachedData = usePersistentFallback(cacheKey, getCache);
  return useMemo(
    () =>
      cachedData === undefined
        ? undefined
        : ({
            status: 200,
            data: cachedData,
            headers: new Headers(),
          } as TResponse),
    [cachedData],
  );
}

type PersistentSWROptions<TData, TError> = {
  cacheKey: string;
  getCache: (key: string) => Promise<TData | undefined>;
  setCache: (key: string, data: TData) => Promise<unknown>;
  swr?: SWRConfiguration<TData, TError>;
};

export function usePersistentSWR<TData, TError = Error>(
  key: Key,
  fetcher: () => Promise<TData>,
  { cacheKey, getCache, setCache, swr }: PersistentSWROptions<TData, TError>,
): SWRResponse<TData, TError> {
  const persisted = usePersistentFallback(cacheKey, getCache);
  const fetchAndPersist = useCallback(async () => {
    const fresh = await fetcher();
    void setCache(cacheKey, fresh).catch(() => undefined);
    return fresh;
  }, [cacheKey, fetcher, setCache]);
  const response = useSWR<TData, TError>(key, fetchAndPersist, swr);
  const data = response.data ?? persisted;

  return {
    ...response,
    data,
    isLoading: response.isLoading && data === undefined,
  };
}
