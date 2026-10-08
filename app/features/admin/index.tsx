import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/shared/components/ui/tabs";
import BrokenQuizManager from "./brokenQuizzes";
import ImageManager from "./images";
import LevelSettingsManager from "./levels";
import OrphanedTanbunManager from "./orphanedTanbuns";
import PageRankManager from "./pagerank";
import PowerSettingsManager from "./power";
import AdminUserManager from "./users";
import WorkloadSettingsManager from "./workload";

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");
  const [tab, setTab] = useState(view === "pagerank" ? "pagerank" : "orphans");
  useEffect(() => {
    if (view === "pagerank") setTab("pagerank");
  }, [view]);

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">確認中…</p>;
  }
  if (!user?.is_superuser) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          この画面を利用する権限がありません。
        </p>
      </div>
    );
  }
  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <div className="border-b px-4 py-2 sm:px-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="orphans">孤立Tanbun</TabsTrigger>
          <TabsTrigger value="misplaced">配置切れTanbun</TabsTrigger>
          <TabsTrigger value="broken-quizzes">参照切れQuiz</TabsTrigger>
          <TabsTrigger value="users">ユーザー</TabsTrigger>
          <TabsTrigger value="workload">負荷制御</TabsTrigger>
          <TabsTrigger value="levels">レベル</TabsTrigger>
          <TabsTrigger value="power">Power</TabsTrigger>
          <TabsTrigger value="pagerank">PageRank</TabsTrigger>
          <TabsTrigger value="images">画像</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="orphans" className="mt-0">
        <OrphanedTanbunManager kind="orphaned" />
      </TabsContent>
      <TabsContent value="misplaced" className="mt-0">
        <OrphanedTanbunManager kind="misplaced" />
      </TabsContent>
      <TabsContent value="broken-quizzes" className="mt-0">
        <BrokenQuizManager />
      </TabsContent>
      <TabsContent value="users" className="mt-0">
        <AdminUserManager />
      </TabsContent>
      <TabsContent value="workload" className="mt-0">
        <WorkloadSettingsManager />
      </TabsContent>
      <TabsContent value="levels" className="mt-0">
        <LevelSettingsManager />
      </TabsContent>
      <TabsContent value="power" className="mt-0">
        <PowerSettingsManager />
      </TabsContent>
      <TabsContent value="pagerank" className="mt-0">
        <PageRankManager />
      </TabsContent>
      <TabsContent value="images" className="mt-0">
        <ImageManager />
      </TabsContent>
    </Tabs>
  );
}
