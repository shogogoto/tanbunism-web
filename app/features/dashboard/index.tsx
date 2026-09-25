import { BookOpen, FolderOpen, ListChecks, SquareCheckBig } from "lucide-react";
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
import RecentAnswers from "./RecentAnswers";

export default function Dashboard() {
  const { user } = useAuth();
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

        <section className="grid gap-3 sm:grid-cols-3">
          <Button asChild size="lg" className="h-auto justify-start gap-3 p-4">
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
            size="lg"
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
            size="lg"
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
        </section>

        <DashboardAchievement />

        <RecentAnswers />

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
                <Button size="sm">
                  <BookOpen className="size-4" />
                  取り込む
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
      </div>
    </AuthGuard>
  );
}
