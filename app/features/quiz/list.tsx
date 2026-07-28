import AuthGuard from "~/features/auth/AuthGuard";
import QuizList from "./QuizList";

export default function QuizListPage() {
  return (
    <AuthGuard>
      <QuizList />
    </AuthGuard>
  );
}
