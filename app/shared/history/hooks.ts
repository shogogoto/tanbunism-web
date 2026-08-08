import { useCallback } from "react";
import { useLocation } from "react-router";
import useSWR, { useSWRConfig } from "swr";
import { historyCache } from "~/shared/lib/indexed";
import type {
  MResource,
  Tanbun,
  UserReadPublic,
} from "../generated/fastAPI.schemas";
import type { HistoryItemType } from "./types";

const SWR_KEY = "history";

export function useHistory() {
  const { data: histories } = useSWR(SWR_KEY, () => historyCache.getAll());
  const { mutate } = useSWRConfig();
  const location = useLocation();

  const addHistory = useCallback(
    async (item: Omit<HistoryItemType, "id" | "timestamp" | "url">) => {
      const url = location.pathname + location.search;
      if (url.includes("/home")) return;
      await historyCache.add({ ...item, url });
      const newHistories = await historyCache.getAll();
      await mutate(SWR_KEY, newHistories, { revalidate: false });
    },
    [location, mutate],
  );

  const getTanbunTitle = useCallback((k: Tanbun) => {
    if (k.term?.names) return k.term?.names.join(", ");
    return k.sentence;
  }, []);

  const getUserTitle = useCallback((u: UserReadPublic) => {
    return u.display_name || u.username || u.uid;
  }, []);

  const getResourcreTitle = useCallback((r: MResource) => {
    return r.name;
  }, []);

  return {
    histories: histories ?? [],
    addHistory,
    getTanbunTitle,
    getUserTitle,
    getResourcreTitle,
  };
}
