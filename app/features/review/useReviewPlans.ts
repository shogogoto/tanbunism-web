import useSWR from "swr";
import { useAuth } from "~/features/auth/AuthProvider";
import { listStudyPlans } from "~/features/quiz/api";

export const normalizeResourceId = (id: string) =>
  id.replaceAll("-", "").toLowerCase();

export function useReviewPlans() {
  const { user, isAuthenticated } = useAuth();
  return useSWR(
    isAuthenticated && user ? ["review-study-plans", user.uid] : null,
    () => listStudyPlans({ forceRefresh: true }),
    { dedupingInterval: 30_000 },
  );
}
