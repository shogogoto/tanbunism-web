import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import NamespaceExplorer from "~/features/namespace/components/NamespaceExplorer";
import Uploader from "~/features/namespace/uploader/Uploader";
import AnswerHistory from "~/features/quiz/AnswerHistory";
import StudyPlanManager from "~/features/quiz/StudyPlanManager";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import PersonalTimeline from "./PersonalTimeline";
import QuizTimeline from "./QuizTimeline";
import {
  type DashboardSection,
  dashboardSections,
  isDashboardSection,
} from "./sections";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("view");
  const activeSection = isDashboardSection(requestedSection)
    ? requestedSection
    : "timeline";
  const [mountedSections, setMountedSections] = useState<Set<DashboardSection>>(
    () => new Set([activeSection]),
  );
  const touchStartX = useRef<number | undefined>(undefined);
  const namespace = useGetNamaspaceNamespaceGet({
    fetch: { credentials: "include" },
    swr: { enabled: mountedSections.has("notes") },
  });

  useEffect(() => {
    setMountedSections((current) => {
      if (current.has(activeSection)) return current;
      return new Set([...current, activeSection]);
    });
  }, [activeSection]);

  function setActiveSection(section: DashboardSection) {
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
            touchStartX.current = event.touches[0]?.clientX;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            const end = event.changedTouches[0]?.clientX;
            if (start === undefined || end === undefined) return;
            touchStartX.current = undefined;
            const index = dashboardSections.findIndex(
              (section) => section.id === activeSection,
            );
            if (Math.abs(end - start) < 40) return;
            const nextIndex = end < start ? index + 1 : index - 1;
            const next = dashboardSections[nextIndex];
            if (next) setActiveSection(next.id);
          }}
          onTouchCancel={() => {
            touchStartX.current = undefined;
          }}
        >
          <div className="relative">
            {mountedSections.has("timeline") && (
              <div hidden={activeSection !== "timeline"}>
                <PersonalTimeline />
              </div>
            )}
            {mountedSections.has("quiz-timeline") && (
              <div hidden={activeSection !== "quiz-timeline"}>
                <QuizTimeline />
              </div>
            )}
            {mountedSections.has("answers") && (
              <div hidden={activeSection !== "answers"}>
                <AnswerHistory />
              </div>
            )}
            {mountedSections.has("notes") && (
              <div hidden={activeSection !== "notes"}>
                <Dialog>
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <NamespaceExplorer nsprops={namespace} />
                    </CardContent>
                  </Card>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      className="fixed bottom-20 right-4 z-30 size-12 rounded-full shadow-xl ring-4 ring-background transition-transform hover:scale-105 md:bottom-6 md:right-6"
                      aria-label="読書メモを取り込む"
                      title="読書メモを取り込む"
                    >
                      <Plus className="size-6" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="h-[90vh] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-5xl">
                    <Uploader refresh={() => void namespace.mutate()} />
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {mountedSections.has("study-plans") && (
              <div hidden={activeSection !== "study-plans"}>
                <StudyPlanManager />
              </div>
            )}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
