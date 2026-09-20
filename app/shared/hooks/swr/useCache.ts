import { useEffect, useState } from "react";

export function createCacheKey<TParams extends object>(
  prefix: string,
  params: TParams,
) {
  const sortedParams = Object.fromEntries(Object.entries(params).sort());
  return `${prefix}-${JSON.stringify(sortedParams)}`;
}

export function useCachedSWR<TData, TResponse>(
  cacheKey: string,
  getCache: (key: string) => Promise<TData | undefined>,
) {
  const [fallbackData, setFallbackData] = useState<TResponse | undefined>(
    undefined,
  );

  useEffect(() => {
    let isMounted = true;
    async function loadCache() {
      const cachedData = await getCache(cacheKey);
      if (isMounted && cachedData) {
        const res = {
          status: 200,
          data: cachedData,
          headers: new Headers(),
        } as TResponse;
        setFallbackData(res);
      }
    }
    loadCache();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, getCache]);

  return fallbackData;
}
