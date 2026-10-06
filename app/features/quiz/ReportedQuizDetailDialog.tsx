import { Eye } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import QuizPrompt from "./QuizPrompt";
import type { QuizReport, ReadableQuiz } from "./api";
import { quizOptionLabel } from "./relationPresentation";

const reasonLabels: Record<QuizReport["reason"], string> = {
  undefined: "未定義",
  incorrect: "内容が不正確",
  other: "その他",
};

export default function ReportedQuizDetailDialog({
  report,
  quiz,
}: {
  report: QuizReport;
  quiz: ReadableQuiz;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Eye /> 詳細
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="destructive">{reasonLabels[report.reason]}</Badge>
            <span className="text-xs text-muted-foreground">
              {report.report_count}件の報告
            </span>
          </div>
          <DialogTitle>報告されたクイズ</DialogTitle>
          <DialogDescription>
            {report.detail || "報告者からの詳細はありません。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <QuizPrompt quiz={quiz} />
          <div className="divide-y border-y sm:border-x">
            {Object.entries(quiz.options).map(([optionId, option], index) => (
              <div
                key={optionId}
                className="flex items-start gap-2 px-3 py-2 text-sm"
              >
                <span className="w-5 shrink-0 text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {quizOptionLabel(quiz, option)}
                </span>
                {quiz.correct.includes(optionId) && <Badge>正解</Badge>}
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Resource</dt>
            <dd className="min-w-0 truncate">
              {report.resource_id ? (
                <Link
                  to={`/resource/${report.resource_id}`}
                  className="underline underline-offset-2"
                >
                  {report.resource_name ?? report.resource_id}
                </Link>
              ) : (
                "不明"
              )}
            </dd>
            <dt className="text-muted-foreground">Quiz ID</dt>
            <dd className="min-w-0 break-all font-mono">{report.quiz_id}</dd>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
