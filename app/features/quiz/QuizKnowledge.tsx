import { HashLink } from "~/shared/components/HashLink";
import type { QuizChain } from "./api";

export function findTargetSentenceId(chain: QuizChain) {
  return chain.links.find((link) => link.role === "target")?.sentence_id;
}

export function ChainSentenceLink({
  chain,
  sentenceId,
  children,
}: {
  chain?: QuizChain;
  sentenceId?: string;
  children: React.ReactNode;
}) {
  const sentence = chain?.sentences.find(({ uid }) => uid === sentenceId);
  if (!sentence) return children;

  return (
    <HashLink
      to={`/resource/${sentence.resource_uid}#${sentence.uid}`}
      title={sentence.sentence}
      className="hover:text-primary hover:underline"
    >
      {children}
    </HashLink>
  );
}

export function RelationAnnotation({
  chain,
  sentenceId,
}: {
  chain: QuizChain;
  sentenceId: string;
}) {
  const relations = chain.links.find(
    (link) => link.sentence_id === sentenceId,
  )?.relations;
  if (!relations || relations.length === 0) return null;

  return (
    <span className="text-xs font-normal text-muted-foreground">
      {relations.join(" → ")}
    </span>
  );
}
