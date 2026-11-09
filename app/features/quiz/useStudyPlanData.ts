import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { requestGameState } from "~/features/game/state";
import { useNotifications } from "~/features/notifications/NotificationProvider";
import {
  type StudyPlan,
  type StudyPlanPreparationStatus,
  type StudyResource,
  listStudyPlanPreparations,
  listStudyPlans,
  listStudyResources,
} from "./api";
import { dungeonAchievements } from "./studyPlanView";
import { useQuizSWR } from "./useQuizSWR";

const emptyPlans: StudyPlan[] = [];
const emptyResources: StudyResource[] = [];
const emptyPreparations: StudyPlanPreparationStatus[] = [];

/** Own data freshness and notification-driven refresh; never own UI selection or edits. */
export function useStudyPlanData() {
  const { notifications, refreshNotifications } = useNotifications();
  const {
    data: plans = emptyPlans,
    error: plansError,
    isLoading,
    mutate: mutatePlans,
  } = useQuizSWR("study-plan-manager-plans", listStudyPlans, {
    keepPreviousData: true,
  });
  const { data: resources = emptyResources, error: resourcesError } =
    useQuizSWR("study-plan-manager-resources", listStudyResources, {
      keepPreviousData: true,
    });
  const {
    data: preparations = emptyPreparations,
    error: preparationsError,
    mutate: mutatePreparations,
  } = useSWR(
    "study-plan-manager-preparations",
    () => listStudyPlanPreparations({ forceRefresh: true }),
    { keepPreviousData: true, refreshInterval: 5000 },
  );
  const [adventureAchievements, setAdventureAchievements] = useState<
    Record<string, number>
  >({});
  const latestNotification = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void requestGameState()
      .then(({ save }) => {
        if (active) setAdventureAchievements(dungeonAchievements(save));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const latest = notifications.find(
      ({ kind }) =>
        kind === "quiz_preparation_complete" ||
        kind === "quiz_preparation_failed",
    );
    if (!latest || latestNotification.current === latest.uid) return;
    latestNotification.current = latest.uid;
    void listStudyPlanPreparations({ forceRefresh: true })
      .then((fresh) => mutatePreparations(fresh, { revalidate: false }))
      .catch(() => undefined);
  }, [mutatePreparations, notifications]);

  return {
    plans,
    resources,
    preparations,
    isLoading,
    loadError: plansError ?? resourcesError ?? preparationsError,
    mutatePlans,
    mutatePreparations,
    adventureAchievements,
    refreshNotifications,
  };
}
