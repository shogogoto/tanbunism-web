import {
  type SearchParamsConfig,
  createGenericSearchContext,
} from "~/shared/contexts/createGenericSearchContext";
import type { UserSearchBody } from "~/shared/generated/fastAPI.schemas";

type UserSearchBodyOrderBy = NonNullable<UserSearchBody["order_by"]>;

const initialOrderBy: UserSearchBodyOrderBy = ["username"];

type UserSearch = {
  q: string;
  desc: boolean;
  order_by: UserSearchBodyOrderBy;
};

const config: SearchParamsConfig<UserSearch> = {
  q: {
    defaultValue: "",
    serialize: (value) => (value ? { q: value } : { q: "" }),
    deserialize: (params) => params.get("q") ?? "",
  },
  desc: {
    defaultValue: true,
    serialize: (value) => ({ desc: String(value) }),
    deserialize: (params) => params.get("desc") !== "false",
  },
  order_by: {
    defaultValue: initialOrderBy,
    serialize: (value) => ({
      order_by: value?.join(",") ?? initialOrderBy.join(","),
    }),
    deserialize: (params) =>
      (params
        .get("order_by")
        ?.split(",")
        .filter(Boolean) as UserSearchBodyOrderBy) ?? initialOrderBy,
  },
};

const { SearchProvider, useSearch } = createGenericSearchContext(config);

export const UserSearchProvider = SearchProvider;
export const useUserSearch = useSearch;
