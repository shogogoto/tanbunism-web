import AuthGuard from "~/features/auth/AuthGuard";
import QuizTimeline from "~/features/dashboard/QuizTimeline";

export default function QuizPage() {
  return (
    <AuthGuard>
      <div className="p-2 sm:p-3">
        <QuizTimeline scope="global" />
      </div>
    </AuthGuard>
  );
}
