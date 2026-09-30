import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import NamespaceExplorer from "~/features/namespace/components/NamespaceExplorer";
import AnswerHistory from "~/features/quiz/AnswerHistory";
import QuizList from "~/features/quiz/QuizList";
import StudyPlanManager from "~/features/quiz/StudyPlanManager";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import PersonalTimeline from "./PersonalTimeline";
import QuizTimeline from "./QuizTimeline";
import ResourceLearningOverview from "./ResourceLearningOverview";
import {
  type DashboardSection,
  dashboardSections,
  isDashboardSection,
} from "./sections";
import {
  type SwipeGesture,
  finishSwipeGesture,
  lockSwipeAxis,
  startSwipeGesture,
} from "./swipe";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("view");
  const activeSection = isDashboardSection(requestedSection)
    ? requestedSection
    : "timeline";
  const [mountedSections, setMountedSections] = useState<Set<DashboardSection>>(
    () => new Set([activeSection]),
  );
  const renderedSections = new Set(mountedSections).add(activeSection);
  const touchGesture = useRef<SwipeGesture | undefined>(undefined);
  const namespace = useGetNamaspaceNamespaceGet({
    fetch: { credentials: "include" },
    swr: { enabled: renderedSections.has("notes") },
  });

  useEffect(() => {
    setMountedSections((current) => {
      if (current.has(activeSection)) return current;
      return new Set([...current, activeSection]);
    });
  }, [activeSection]);

  function setActiveSection(section: DashboardSection) {
    setMountedSections((current) =>
      current.has(section) ? current : new Set([...current, section]),
    );
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (section === "timeline") next.delete("view");
      else next.set("view", section);
      return next;
    });
  }

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-5xl p-2 sm:p-3">
        <section
          className="min-h-[65vh] pb-8"
          onTouchStart={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-dashboard-swipe-ignore]")
            ) {
              touchGesture.current = undefined;
              return;
            }
            const touch = event.touches[0];
            touchGesture.current = touch
              ? startSwipeGesture(touch.clientX, touch.clientY)
              : undefined;
          }}
          onTouchMove={(event) => {
            const gesture = touchGesture.current;
            const touch = event.touches[0];
            if (!gesture || !touch) return;
            touchGesture.current = lockSwipeAxis(
              gesture,
              touch.clientX,
              touch.clientY,
            );
          }}
          onTouchEnd={(event) => {
            const gesture = touchGesture.current;
            const end = event.changedTouches[0];
            touchGesture.current = undefined;
            if (!gesture || !end) return;
            const direction = finishSwipeGesture(
              gesture,
              end.clientX,
              end.clientY,
            );
            if (!direction) return;
            const index = dashboardSections.findIndex(
              (section) => section.id === activeSection,
            );
            const nextIndex = direction === "left" ? index + 1 : index - 1;
            const next = dashboardSections[nextIndex];
            if (next) setActiveSection(next.id);
          }}
          onTouchCancel={() => {
            touchGesture.current = undefined;
          }}
        >
          <div className="relative">
            {renderedSections.has("timeline") && (
              <div hidden={activeSection !== "timeline"}>
                <PersonalTimeline />
              </div>
            )}
            {renderedSections.has("quiz-timeline") && (
              <div hidden={activeSection !== "quiz-timeline"}>
                <QuizTimeline />
              </div>
            )}
            {renderedSections.has("answers") && (
              <div hidden={activeSection !== "answers"}>
                <AnswerHistory />
              </div>
            )}
            {renderedSections.has("notes") && (
              <div hidden={activeSection !== "notes"}>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <NamespaceExplorer nsprops={namespace} />
                    <ResourceLearningOverview />
                  </CardContent>
                </Card>
                <Button
                  asChild
                  size="icon"
                  className="fixed bottom-20 right-4 z-30 size-12 rounded-full shadow-xl ring-4 ring-background transition-transform hover:scale-105 md:bottom-6 md:right-6"
                >
                  <Link
                    to="/import"
                    aria-label="読書メモを取り込む"
                    title="読書メモを取り込む"
                  >
                    <Plus className="size-6" />
                  </Link>
                </Button>
              </div>
            )}
            {renderedSections.has("study-plans") && (
              <div hidden={activeSection !== "study-plans"}>
                <StudyPlanManager />
              </div>
            )}
            {renderedSections.has("quiz-management") && (
              <div hidden={activeSection !== "quiz-management"}>
                <QuizList embedded />
              </div>
            )}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
