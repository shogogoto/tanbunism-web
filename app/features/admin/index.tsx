import { useAuth } from "~/features/auth/AuthProvider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/shared/components/ui/tabs";
import BrokenQuizManager from "./brokenQuizzes";
import OrphanedTanbunManager from "./orphanedTanbuns";
import QuizPreparationSettingsManager from "./quizPreparation";
import AdminUserManager from "./users";

export default function Admin() {
  const { user, isLoading } = useAuth();

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
    <Tabs defaultValue="orphans" className="gap-0">
      <div className="border-b px-4 py-2 sm:px-6">
        <TabsList>
          <TabsTrigger value="orphans">孤立Tanbun</TabsTrigger>
          <TabsTrigger value="broken-quizzes">参照切れQuiz</TabsTrigger>
          <TabsTrigger value="users">ユーザー</TabsTrigger>
          <TabsTrigger value="quiz-preparation">クイズ作成</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="orphans" className="mt-0">
        <OrphanedTanbunManager />
      </TabsContent>
      <TabsContent value="broken-quizzes" className="mt-0">
        <BrokenQuizManager />
      </TabsContent>
      <TabsContent value="users" className="mt-0">
        <AdminUserManager />
      </TabsContent>
      <TabsContent value="quiz-preparation" className="mt-0">
        <QuizPreparationSettingsManager />
      </TabsContent>
    </Tabs>
  );
}
