import { useContext, useEffect, useMemo } from "react";
import PageContext from "~/shared/components/Pagenation/PageContext";
import { PageProvider } from "~/shared/components/Pagenation/PageProvider";
import SearchLayout from "~/shared/components/SearchLayout";
import type {
  UserSearchBody,
  UserSearchResult,
} from "~/shared/generated/fastAPI.schemas";
import { useSearchUserUserSearchPost } from "~/shared/generated/public-user/public-user";
import { useDebounce } from "~/shared/hooks/useDebounce";
import UserSearchBar from "./SearchBar";
import { UserSearchProvider, useUserSearch } from "./SearchContext";
import SearchResult from "./SearchResult";

function _UserSearch() {
  const {
    params: { q, desc, order_by },
  } = useUserSearch();

  const { current, pageSize, handleSuccess } = useContext(PageContext);

  const params: UserSearchBody = useMemo(() => {
    return {
      q,
      paging: {
        page: current || 1,
        size: pageSize,
      },
      desc,
      order_by,
    };
  }, [q, desc, order_by, current, pageSize]);
  const debouncedParams = useDebounce(params, 500);

  const { trigger, data, isMutating } = useSearchUserUserSearchPost({
    swr: {
      onSuccess: (data) => {
        if (data.status === 200) {
          handleSuccess(data.data.total || 0, pageSize);
        }
      },
    },
  });

  useEffect(() => {
    trigger(debouncedParams);
  }, [trigger, debouncedParams]);

  const displayData: UserSearchResult =
    data?.status === 200 ? data.data : { total: 0, data: [] };

  const bar = <UserSearchBar isLoading={isMutating} />;
  const main = <SearchResult result={displayData} />;
  return <SearchLayout header={bar} main={main} />;
}

export default function UserSearch() {
  return (
    <UserSearchProvider>
      <PageProvider pageSize={30}>
        <_UserSearch />
      </PageProvider>
    </UserSearchProvider>
  );
}
