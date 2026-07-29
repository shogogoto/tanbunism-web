import AuthGuard from "~/features/auth/AuthGuard";
import QuizSession from "./QuizSession";

export default function QuizPage() {
  return (
    <AuthGuard>
      <QuizSession />
    </AuthGuard>
  );
}
