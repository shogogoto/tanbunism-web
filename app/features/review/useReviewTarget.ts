import { useSearchParams } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import { useRecommendationDay } from "~/shared/lib/recommendationDay";
import { presetStorageKey } from "./settings";
import { normalizeResourceId, useReviewPlans } from "./useReviewPlans";

/** URL-backed target selection shared by the header and review content. */
export function useReviewTarget() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { data: plans, error: plansError } = useReviewPlans();
  const requestedResource = params.get("resource");
  const requestedPlan = params.get("plan");
  const resourcePlans = requestedResource
    ? plans?.filter((plan) =>
        plan.resource_ids.some(
          (id) =>
            normalizeResourceId(id) === normalizeResourceId(requestedResource),
        ),
      )
    : undefined;
  const planId =
    requestedPlan ??
    (
      resourcePlans?.find((plan) => plan.resource_ids.length === 1) ??
      resourcePlans?.[0]
    )?.uid;
  const plan = plans?.find((candidate) => candidate.uid === planId);
  let storedPreset = "default";
  try {
    if (user && typeof localStorage !== "undefined")
      storedPreset =
        localStorage.getItem(presetStorageKey(user.uid)) ?? "default";
  } catch {
    /* localStorageが無効でも標準設定を使う */
  }
  const preset = params.get("preset") ?? storedPreset;
  function selectPreset(id: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("resource");
        if (id.startsWith("plan:")) {
          next.set("plan", id.slice(5));
          next.delete("preset");
        } else {
          next.delete("plan");
          next.set("preset", id);
        }
        return next;
      },
      { replace: true },
    );
  }
  const profile = planId ? `plan:${planId}` : preset;
  const today = useRecommendationDay();
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const value = new Date(`${today}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() - index);
    return value.toISOString().slice(0, 10);
  });
  const requestedDay = params.get("day");
  const selectedDay =
    !planId && requestedDay && recentDays.includes(requestedDay)
      ? requestedDay
      : today;
  function selectDay(day: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (planId) {
          next.delete("plan");
          next.delete("resource");
          next.set("preset", "default");
        }
        if (day === today) next.delete("day");
        else next.set("day", day);
        return next;
      },
      { replace: true },
    );
  }
  const targetPending = !!requestedResource && !plans && !plansError;
  const targetMissing =
    (!!requestedResource && !!plans && !planId) ||
    (!!requestedPlan && !!plans && !plan);
  return {
    params,
    setParams,
    requestedResource,
    plansError,
    planId,
    plan,
    preset,
    profile,
    recentDays,
    selectedDay,
    selectPreset,
    selectDay,
    targetPending,
    targetMissing,
  };
}
