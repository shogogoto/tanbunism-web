import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import QuizSession from "~/features/quiz/QuizSession";
import {
  type SwipeGesture,
  finishSwipeGesture,
  lockSwipeAxis,
  startSwipeGesture,
} from "~/shared/lib/swipe";
import PersonalTimeline from "./PersonalTimeline";
import QuizTimeline from "./QuizTimeline";

export default function Review() {
  const [params, setParams] = useSearchParams();
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
        {rendered.has("knowledge") && (
          <div hidden={active !== "knowledge"}>
            <PersonalTimeline />
          </div>
        )}
        {rendered.has("quiz") && (
          <div hidden={active !== "quiz"}>
            {params.has("plan") ? (
              <>
                <Link
                  to="/review?view=quiz"
                  className="mb-2 inline-block text-sm text-muted-foreground hover:underline"
                >
                  日替わりの復習へ戻る
                </Link>
                <QuizSession />
              </>
            ) : (
              <QuizTimeline />
            )}
          </div>
        )}
      </section>
    </AuthGuard>
  );
}
