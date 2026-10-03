import useSWR, {
  type Key,
  type SWRConfiguration,
  type SWRResponse,
  useSWRConfig,
} from "swr";
import type { QuizCacheOptions } from "./api";
import { hasQuizCacheIdentity } from "./cache";

/**
 * 永続cacheを先にSWRへ返し、期限切れなら最新値へバックグラウンドで差し替える。
 */
export function useQuizSWR<TData, TError = Error>(
  key: Key,
  load: (options?: QuizCacheOptions) => Promise<TData>,
  config?: SWRConfiguration<TData, TError>,
): SWRResponse<TData, TError> {
  const { mutate } = useSWRConfig();

  return useSWR<TData, TError>(
    key,
    async () => {
      const visible = await load();
      if (!hasQuizCacheIdentity()) return visible;
      void load({ waitForRefresh: true })
        .then((fresh) => mutate(key, fresh, { revalidate: false }))
        .catch(() => undefined);
      return visible;
    },
    config,
  );
}
