import { HashLink } from "~/shared/components/HashLink";
import { Badge } from "~/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import type { QuizChain } from "./api";
import type { Knowde, QuizChainLink, QuizChainRole } from "./generated/models";

const roleLabels: Record<QuizChainRole, string> = {
  target: "出題対象",
  correct: "正解",
  option: "選択肢",
};

function KnowdeLink({ knowde }: { knowde: Knowde }) {
  const terms = knowde.term?.names?.join(" / ");
  const label = terms ? `${terms}: ${knowde.sentence}` : knowde.sentence;

  return (
    <HashLink
      to={`/resource/${knowde.resource_uid}#${knowde.uid}`}
      aria-label={label}
      title="この単文から学習を続ける"
      className="group hover:text-primary"
    >
      {terms && <strong>{terms}: </strong>}
      <span className="group-hover:underline">{knowde.sentence}</span>
      <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground group-hover:text-primary">
        単文へ →
      </span>
    </HashLink>
  );
}

function RoleBadges({ roles }: { roles: QuizChainRole[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {[...new Set(roles)].map((role) => (
        <Badge key={role} variant="secondary">
          {roleLabels[role]}
        </Badge>
      ))}
    </div>
  );
}

function TermKnowledge({
  knowdes,
  links,
}: {
  knowdes: Knowde[];
  links: QuizChainLink[];
}) {
  return (
    <div className="space-y-2">
      {knowdes.map((knowde) => (
        <div key={knowde.uid} className="space-y-2 border p-3">
          <RoleBadges
            roles={links
              .filter((link) => link.sentence_id === knowde.uid)
              .map((link) => link.role)}
          />
          <p className="text-sm leading-relaxed">
            <KnowdeLink knowde={knowde} />
          </p>
        </div>
      ))}
    </div>
  );
}

function RelationKnowledge({
  knowdes,
  links,
}: {
  knowdes: Knowde[];
  links: QuizChainLink[];
}) {
  const knowdeById = new Map(knowdes.map((knowde) => [knowde.uid, knowde]));
  const targetLink = links.find((link) => link.role === "target");
  const target = targetLink && knowdeById.get(targetLink.sentence_id);
  const destinations = links.filter(
    (link) =>
      link.role !== "target" && link.sentence_id !== targetLink?.sentence_id,
  );

  if (!target || destinations.length === 0) {
    return <TermKnowledge knowdes={knowdes} links={links} />;
  }

  return (
    <div className="space-y-2">
      {destinations.map((link) => {
        const destination = knowdeById.get(link.sentence_id);
        if (!destination) return null;

        return (
          <div
            key={`${link.role}-${link.sentence_id}`}
            className="space-y-3 border p-3"
          >
            <RoleBadges roles={[link.role]} />
            <div className="grid gap-2 text-sm leading-relaxed sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <KnowdeLink knowde={target} />
              <span className="text-muted-foreground">
                —[{link.relations?.join("の") || "関係なし"}]→
              </span>
              <KnowdeLink knowde={destination} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function QuizChainReview({ chain }: { chain: QuizChain }) {
  if (chain.sentences.length === 0) return null;

  const quizType = chain.quizzes[0]?.quiz_type;
  const isRelationQuiz = quizType === "rel2pair" || quizType === "pair2rel";

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle className="text-base">このクイズの知識</CardTitle>
      </CardHeader>
      <CardContent>
        {isRelationQuiz ? (
          <RelationKnowledge knowdes={chain.sentences} links={chain.links} />
        ) : (
          <TermKnowledge knowdes={chain.sentences} links={chain.links} />
        )}
      </CardContent>
    </Card>
  );
}
