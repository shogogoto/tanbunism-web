import AuthGuard from "~/features/auth/AuthGuard";
import AnswerHistory from "./AnswerHistory";

export default function AnswersPage() {
  return (
    <AuthGuard>
      <AnswerHistory />
    </AuthGuard>
  );
}
