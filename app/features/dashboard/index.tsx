import { FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import { ResourceGrowthProvider } from "~/features/gamification/ResourceGrowth";
import NamespaceExplorer from "~/features/namespace/components/NamespaceExplorer";
import AnswerHistory from "~/features/quiz/AnswerHistory";
import QuizList from "~/features/quiz/QuizList";
import StudyPlanManager from "~/features/quiz/StudyPlanManager";
import ReviewSettingsManager from "~/features/review/ReviewSettingsManager";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import {
  type SwipeGesture,
  finishSwipeGesture,
  lockSwipeAxis,
  startSwipeGesture,
} from "~/shared/lib/swipe";
import {
  type DashboardSection,
  dashboardSections,
  isDashboardSection,
} from "./sections";

const panelTransition =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("view");
  const activeSection = isDashboardSection(requestedSection)
    ? requestedSection
    : "review-settings";
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
      if (section === "review-settings") next.delete("view");
      else next.set("view", section);
      return next;
    });
  }

  if (requestedSection === "timeline" || requestedSection === "quiz-timeline") {
    return (
      <Navigate
        replace
        to={requestedSection === "timeline" ? "/review" : "/review?view=quiz"}
      />
    );
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
            {renderedSections.has("review-settings") && (
              <div hidden={activeSection !== "review-settings"}>
                <ReviewSettingsManager />
              </div>
            )}
            {renderedSections.has("answers") && (
              <div
                hidden={activeSection !== "answers"}
                className={
                  activeSection === "answers" ? panelTransition : undefined
                }
              >
                <AnswerHistory />
              </div>
            )}
            {renderedSections.has("notes") && (
              <div
                hidden={activeSection !== "notes"}
                className={
                  activeSection === "notes" ? panelTransition : undefined
                }
              >
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <ResourceGrowthProvider active={activeSection === "notes"}>
                      <NamespaceExplorer
                        nsprops={namespace}
                        toolbarAction={
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="size-9 shrink-0"
                          >
                            <Link
                              to="/import"
                              aria-label="読書メモimport"
                              title="読書メモimport"
                            >
                              <FileUp className="size-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        }
                      />
                    </ResourceGrowthProvider>
                  </CardContent>
                </Card>
              </div>
            )}
            {renderedSections.has("study-plans") && (
              <div
                hidden={activeSection !== "study-plans"}
                className={
                  activeSection === "study-plans" ? panelTransition : undefined
                }
              >
                <StudyPlanManager />
              </div>
            )}
            {renderedSections.has("quiz-management") && (
              <div
                hidden={activeSection !== "quiz-management"}
                className={
                  activeSection === "quiz-management"
                    ? panelTransition
                    : undefined
                }
              >
                <QuizList embedded />
              </div>
            )}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
