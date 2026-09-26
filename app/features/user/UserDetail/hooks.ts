import { useCallback, useEffect } from "react";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import { useGetArchievementHistoryUserArchievementHistoryPost } from "~/shared/generated/public-user/public-user";

export default function useUserDetail({
  user,
}: { user: UserReadPublic | undefined }) {
  const { data, isMutating, trigger } =
    useGetArchievementHistoryUserArchievementHistoryPost();

  const triggerUserDetail = useCallback(() => {
    if (user) {
      trigger({ user_ids: [user.uid] });
    }
  }, [trigger, user]);

  useEffect(() => {
    triggerUserDetail();
  }, [triggerUserDetail]);

  return {
    achievementsData: data,
    isLoading: isMutating,
    triggerUserDetail,
  };
}
