import { useContext, useRef } from "react";
import { ClientOnly } from "~/shared/components/ClientOnly";
import Loading from "~/shared/components/Loading";
import PageContext from "~/shared/components/Pagenation/PageContext";
import { PageProvider } from "~/shared/components/Pagenation/PageProvider";
import SearchLayout from "~/shared/components/SearchLayout";
import type { TanbunSearchResult } from "~/shared/generated/fastAPI.schemas";
import {
  type searchByTextTanbunGetResponse200,
  useSearchByTextTanbunGet,
} from "~/shared/generated/tanbun/tanbun";
import { useHistory } from "~/shared/history/hooks";
import { createCacheKey, useCachedSWR } from "~/shared/hooks/swr/useCache";
import { useDebounce } from "~/shared/hooks/useDebounce";
import { tanbunSearchCache } from "~/shared/lib/indexed";
import TanbunSearchBar from "./SearchBar";
import { TanbunSearchProvider, useTanbunSearch } from "./SearchContext";
import TanbunSearchResults from "./SearchResults";

function TanbunSearchLayout() {
  const {
    params: { q, searchOption, orderBy },
  } = useTanbunSearch();
  const { current, pageSize, handleSuccess } = useContext(PageContext);

  const params = {
    q,
    page: current || 1, // 0 だとbackendで validation error
    size: pageSize,
    type: searchOption,
    ...orderBy,
  };
  const debouncedParams = useDebounce(params, 500);
  const cacheKey = createCacheKey("search", debouncedParams);
  const fallbackData = useDebounce(
    useCachedSWR<
      TanbunSearchResult,
      searchByTextTanbunGetResponse200 & { headers: Headers }
    >(cacheKey, tanbunSearchCache.get),
    300,
  );

  const { addHistory } = useHistory();
  const addedRef = useRef<string | null>(null);

  const { data, isLoading } = useSearchByTextTanbunGet(debouncedParams, {
    swr: {
      revalidateOnFocus: false,
      keepPreviousData: true,
      fallbackData,
      onSuccess: async (data) => {
        if (data.status === 200) {
          handleSuccess(data.data.total || 0, pageSize);
          await tanbunSearchCache.set(cacheKey, data.data);
          // 履歴登録
          if (addedRef.current === q) return;
          addHistory({ title: q || "empty" });
          addedRef.current = q;
        }
      },
    },
  });

  const displayData = data?.status === 200 ? data.data : fallbackData?.data;

  const bar = <TanbunSearchBar isLoading={isLoading && !!displayData} />;
  const result = (
    <div className="flex justify-center w-full">
      {isLoading && !displayData ? (
        <Loading isLoading={true} type="center-x" />
      ) : (
        displayData && <TanbunSearchResults data={displayData} />
      )}
    </div>
  );
  return <SearchLayout header={bar} main={result} />;
}

export default function TanbunSearch() {
  return (
    <ClientOnly>
      {() => (
        <TanbunSearchProvider>
          <PageProvider pageSize={50}>
            <TanbunSearchLayout />
          </PageProvider>
        </TanbunSearchProvider>
      )}
    </ClientOnly>
  );
}
