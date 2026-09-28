import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ListChecks,
  Plus,
  SquareCheckBig,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
import NamespaceExplorer from "~/features/namespace/components/NamespaceExplorer";
import Uploader from "~/features/namespace/uploader/Uploader";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import DashboardAchievement from "./DashboardAchievement";
import DashboardActivity from "./DashboardActivity";
import RecentAnswers from "./RecentAnswers";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("start");
  const touchStartX = useRef<number | undefined>(undefined);
  const namespace = useGetNamaspaceNamespaceGet({
    fetch: { credentials: "include" },
  });

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            {user?.display_name || user?.username
              ? `${user.display_name || user.username}さん、今日は何を学びますか？`
              : "今日は何を学びますか？"}
          </p>
        </header>

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
          <nav
            aria-label="ダッシュボードの表示切り替え"
            role="tablist"
            className="mx-auto flex max-w-full snap-x justify-start gap-6 overflow-x-auto border-b px-2 sm:justify-center"
          >
            {dashboardSections.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={activeSection === section.id}
                className={`relative shrink-0 snap-start px-1 py-2 text-sm transition-colors after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:transition-opacity ${
                  activeSection === section.id
                    ? "font-medium text-foreground after:bg-primary after:opacity-100"
                    : "text-muted-foreground hover:text-foreground after:opacity-0"
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
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
            {activeSection === "start" && <StartPanel />}
            {activeSection === "activity" && (
              <DashboardActivity
                userId={user?.uid}
                userPath={user?.username || user?.uid}
              />
            )}
            {activeSection === "achievement" && <DashboardAchievement />}
            {activeSection === "answers" && <RecentAnswers />}
            {activeSection === "notes" && (
              <Dialog>
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>読書メモ</CardTitle>
                      <CardDescription>
                        Resourceを更新して、次のクイズや発見につなげます。
                      </CardDescription>
                    </div>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        className="rounded-full"
                        aria-label="読書メモを取り込む"
                        title="読書メモを取り込む"
                      >
                        <Plus className="size-5" />
                      </Button>
                    </DialogTrigger>
                  </CardHeader>
                  <CardContent>
                    <NamespaceExplorer nsprops={namespace} />
                  </CardContent>
                </Card>
                <DialogContent className="h-[90vh] w-[calc(100vw-2rem)] max-w-none overflow-hidden p-0 sm:max-w-5xl">
                  <Uploader refresh={() => void namespace.mutate()} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}

const dashboardSections = [
  { id: "start", label: "はじめる" },
  { id: "activity", label: "活動" },
  { id: "achievement", label: "今月" },
  { id: "answers", label: "最近の回答" },
  { id: "notes", label: "読書メモ" },
] as const;

function moveDashboardSection(
  current: string,
  offset: number,
  setSection: (section: string) => void,
) {
  const index = dashboardSections.findIndex(
    (section) => section.id === current,
  );
  const next = dashboardSections[index + offset];
  if (next) setSection(next.id);
}

function StartPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>今日の学習</CardTitle>
        <CardDescription>やることを1つ選んで始めます。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Button asChild className="h-auto justify-start gap-3 p-4">
          <Link to="/quiz">
            <SquareCheckBig className="size-5" />
            <span className="text-left">
              <span className="block">クイズを解く</span>
              <span className="block text-xs font-normal opacity-80">
                StudyPlanから次の問題を始める
              </span>
            </span>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-3 p-4"
        >
          <Link to="/quiz/list">
            <FolderOpen className="size-5" />
            <span className="text-left">
              <span className="block">作成したクイズ</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Resourceごとのクイズを確認する
              </span>
            </span>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-3 p-4"
        >
          <Link to="/study-plans">
            <ListChecks className="size-5" />
            <span className="text-left">
              <span className="block">学習計画</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Resourceとクイズ形式を管理する
              </span>
            </span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
