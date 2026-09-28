import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRef } from "react";
import { useSearchParams } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
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
import DashboardProfile from "./DashboardProfile";
import {
  type DashboardSection,
  dashboardSections,
  isDashboardSection,
} from "./sections";

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("view");
  const activeSection = isDashboardSection(requestedSection)
    ? requestedSection
    : "profile";
  const touchStartX = useRef<number | undefined>(undefined);
  const namespace = useGetNamaspaceNamespaceGet({
    fetch: { credentials: "include" },
  });

  function setActiveSection(section: DashboardSection) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (section === "profile") next.delete("view");
      else next.set("view", section);
      return next;
    });
  }

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <section
          className="min-h-[65vh] space-y-4 pb-8"
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/80 shadow sm:flex"
              aria-label="前のダッシュボード項目"
              onClick={() =>
                moveDashboardSection(activeSection, -1, setActiveSection)
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/80 shadow sm:flex"
              aria-label="次のダッシュボード項目"
              onClick={() =>
                moveDashboardSection(activeSection, 1, setActiveSection)
              }
            >
              <ChevronRight className="size-4" />
            </Button>
            <div hidden={activeSection !== "profile"}>
              <DashboardProfile user={user} />
            </div>
            <div hidden={activeSection !== "answers"}>
              <AnswerHistory />
            </div>
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
            <div hidden={activeSection !== "study-plans"}>
              <StudyPlanManager />
            </div>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}

function moveDashboardSection(
  current: DashboardSection,
  offset: number,
  setSection: (section: DashboardSection) => void,
) {
  const index = dashboardSections.findIndex(
    (section) => section.id === current,
  );
  const next = dashboardSections[index + offset];
  if (next) setSection(next.id);
}
