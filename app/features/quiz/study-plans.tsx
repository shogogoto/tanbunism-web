import AuthGuard from "~/features/auth/AuthGuard";
import StudyPlanManager from "./StudyPlanManager";

export default function StudyPlansPage() {
  return (
    <AuthGuard>
      <StudyPlanManager />
    </AuthGuard>
  );
}
