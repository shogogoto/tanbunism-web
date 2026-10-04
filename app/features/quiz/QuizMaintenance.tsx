import BrokenQuizManager from "./BrokenQuizManager";
import ReportedQuizManager from "./ReportedQuizManager";
import UnplannedQuizManager from "./UnplannedQuizManager";

export default function QuizMaintenance() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">要対応</h2>
        <p className="text-sm text-muted-foreground">
          修復や整理が必要なクイズだけを確認します。
        </p>
      </div>
      <BrokenQuizManager />
      <ReportedQuizManager />
      <UnplannedQuizManager />
    </section>
  );
}
