import { Link } from "react-router";
import { Badge } from "~/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import type { QuizChain } from "./api";
import type { QuizChainRole } from "./generated/models";

const roleLabels: Record<QuizChainRole, string> = {
  target: "出題対象",
  correct: "正解",
  option: "選択肢",
};

export default function QuizChainReview({ chain }: { chain: QuizChain }) {
  if (chain.sentences.length === 0) return null;

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-base">関連する単文</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {chain.sentences.map((sentence) => {
          const roles = [
            ...new Set(
              chain.links
                .filter((link) => link.sentence_id === sentence.sentence_id)
                .map((link) => link.role),
            ),
          ];

          return (
            <Link
              key={sentence.sentence_id}
              to={`/knowde/${sentence.sentence_id}`}
              className="block border p-3 hover:bg-muted"
            >
              <div className="mb-2 flex flex-wrap gap-1">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {roleLabels[role]}
                  </Badge>
                ))}
              </div>
              <p className="text-sm leading-relaxed">{sentence.sentence}</p>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
