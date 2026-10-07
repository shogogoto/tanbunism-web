import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
import QuizSession from "~/features/quiz/QuizSession";
import { useRecommendationDay } from "~/shared/lib/recommendationDay";
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
  const targetPending = !!requestedResource && !plans && !plansError;
  const targetMissing =
    (!!requestedResource && !!plans && !planId) ||
    (!!requestedPlan && !!plans && !plan);
  const active = params.get("view") === "quiz" ? "quiz" : "knowledge";
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState(0);
  const userId = user?.uid;
  useEffect(() => {
    if (!userId || active !== "knowledge") return;
    const controls = controlsRef.current;
    if (!controls) return;
    const measure = () =>
      setControlsHeight(controls.getBoundingClientRect().height);
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(controls);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [userId, active]);
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
        style={
          {
            "--review-controls-height": `${active === "knowledge" ? controlsHeight : 0}px`,
          } as CSSProperties
        }
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
        <div
          ref={controlsRef}
          className={
            active === "knowledge"
              ? "sticky top-0 z-20 border-b bg-background"
              : "mb-3"
          }
        >
          <ReviewSettingsSelector selected={profile} onSelect={selectPreset} />
          {!planId && (
            <label
              className="mx-auto mb-2 flex max-w-3xl items-center gap-2 text-sm"
              data-dashboard-swipe-ignore
            >
              復習日
              <select
                aria-label="復習日"
                value={selectedDay}
                className="h-8 rounded border bg-background px-2"
                onChange={(event) => {
                  const day = event.target.value;
                  setParams(
                    (previous) => {
                      const next = new URLSearchParams(previous);
                      if (day === today) next.delete("day");
                      else next.set("day", day);
                      return next;
                    },
                    { replace: true },
                  );
                }}
              >
                {recentDays.map((day, index) => (
                  <option key={day} value={day}>
                    {index === 0
                      ? "今日"
                      : index === 1
                        ? `昨日（${day}）`
                        : day}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
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
              <PersonalTimeline
                key={`${profile}:${selectedDay}`}
                profile={profile}
                selectedDay={selectedDay}
              />
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
                <QuizTimeline profile={preset} selectedDay={selectedDay} />
              )}
            </div>
          )}
      </section>
    </AuthGuard>
  );
}
