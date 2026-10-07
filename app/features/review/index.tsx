import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
import QuizSession from "~/features/quiz/QuizSession";
import {
  type SwipeGesture,
  finishSwipeGesture,
  lockSwipeAxis,
  startSwipeGesture,
} from "~/shared/lib/swipe";
import PersonalTimeline from "./PersonalTimeline";
import PlanReviewProgress from "./PlanReviewProgress";
import QuizTimeline from "./QuizTimeline";
import ReviewSettingsSelector from "./ReviewSettingsSelector";
import { presetStorageKey } from "./settings";
import { normalizeResourceId, useReviewPlans } from "./useReviewPlans";

export default function Review() {
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
  const targetPending = !!requestedResource && !plans && !plansError;
  const targetMissing =
    (!!requestedResource && !!plans && !planId) ||
    (!!requestedPlan && !!plans && !plan);
  const active = params.get("view") === "quiz" ? "quiz" : "knowledge";
  const [visited, setVisited] = useState(new Set([active]));
  const rendered = new Set(visited).add(active);
  const gesture = useRef<SwipeGesture | undefined>(undefined);
  useEffect(() => {
    setVisited((previous) =>
      previous.has(active) ? previous : new Set([...previous, active]),
    );
  }, [active]);
  return (
    <AuthGuard>
      <section
        className="mx-auto min-h-[65vh] w-full max-w-5xl p-2 pb-8 sm:p-3"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          gesture.current =
            event.target instanceof Element &&
            event.target.closest("[data-dashboard-swipe-ignore]")
              ? undefined
              : touch
                ? startSwipeGesture(touch.clientX, touch.clientY)
                : undefined;
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (gesture.current && touch)
            gesture.current = lockSwipeAxis(
              gesture.current,
              touch.clientX,
              touch.clientY,
            );
        }}
        onTouchEnd={(event) => {
          const current = gesture.current;
          const touch = event.changedTouches[0];
          gesture.current = undefined;
          if (!current || !touch) return;
          const direction = finishSwipeGesture(
            current,
            touch.clientX,
            touch.clientY,
          );
          if (
            (direction === "left" && active === "knowledge") ||
            (direction === "right" && active === "quiz")
          ) {
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              if (direction === "left") next.set("view", "quiz");
              else next.delete("view");
              return next;
            });
          }
        }}
        onTouchCancel={() => {
          gesture.current = undefined;
        }}
      >
        <ReviewSettingsSelector selected={profile} onSelect={selectPreset} />
        {plan && <PlanReviewProgress plan={plan} />}
        {targetPending && <output>学習計画を読み込み中…</output>}
        {(targetMissing || (requestedResource && plansError)) && (
          <p role="alert">
            このリソースの学習計画を取得できませんでした。復習対象を選び直してください。
          </p>
        )}
        {!targetPending &&
          !targetMissing &&
          !(requestedResource && plansError) &&
          rendered.has("knowledge") && (
            <div hidden={active !== "knowledge"}>
              <PersonalTimeline key={profile} profile={profile} />
            </div>
          )}
        {!targetPending &&
          !targetMissing &&
          !(requestedResource && plansError) &&
          rendered.has("quiz") && (
            <div hidden={active !== "quiz"}>
              {planId ? (
                <QuizSession key={planId} planId={planId} />
              ) : (
                <QuizTimeline profile={preset} />
              )}
            </div>
          )}
      </section>
    </AuthGuard>
  );
}
