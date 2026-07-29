import { Calendar, MapPin, User } from "lucide-react";
import { Link } from "react-router";
import { HashLink } from "~/shared/components/HashLink";
import type { Additional } from "~/shared/generated/fastAPI.schemas";
import { toFormulas } from "~/shared/lib/formula";
import { useResourceDetail } from "../Context";
import RefLinkSentence from "../LinkedSentence";
import Relations from "../Relations";
import SentenceQuizActions from "../SentenceQuizActions";
import type { toAdjacent } from "../util";

type Props = {
  adj: ReturnType<typeof toAdjacent>;
  prefix?: React.ReactNode;
};

export default function DefPresenter({ adj, prefix }: Props) {
  const { rootId } = useResourceDetail();
  const refs = adj.refers();
  const quoterm = adj.quoterm()[0];

  if (quoterm) {
    return (
      <div>
        <span>{prefix}</span>
        <HashLink
          to={`/resource/${rootId}/#${quoterm.kn.uid}`}
          className="inline-flex flex-shrink-0"
        >
          <span>{adj.kn.sentence.replaceAll("`", "")} |</span>
          <DefPresenter adj={quoterm} />
        </HashLink>
      </div>
    );
  }

  return (
    <div className="space-x-1">
      <span>{prefix}</span>
      {/* このinline-flexがないよリンクが改行される */}
      <Link to={`/knowde/${adj.kn.uid}`} className="inline-flex flex-shrink-0">
        🔗
      </Link>
      <div className="inline-flex gap-2">
        {adj.kn.term?.names?.map((name) => (
          <span
            key={name}
            className="rounded-full font-bold text-green-800  dark:text-green-500"
          >
            {name}
          </span>
        ))}
      </div>
      {adj.kn.term?.names?.length && ":  "}
      {toFormulas(adj.kn.sentence).map((formulaOrString) => {
        if (typeof formulaOrString === "string") {
          return (
            <RefLinkSentence
              key={formulaOrString}
              sentence={formulaOrString}
              refers={refs}
            />
          );
        }

        return formulaOrString;
      })}
      {adj.kn.additional && Object.keys(adj.kn.additional).length && (
        <span className="inline-flex ml-2 text-sm text-muted-foreground">
          <AdditionalComponent additional={adj.kn.additional} />
        </span>
      )}
      <Relations startId={adj.kn.uid} />
      <SentenceQuizActions sentenceId={adj.kn.uid} />
    </div>
  );
}

function forDisplay(value: string | object) {
  if (typeof value === "string") {
    return value;
  }
  const { terms, uids } = useResourceDetail();
  if (value && "uid" in value && typeof value.uid === "string") {
    const term = terms[value.uid];
    const sentence = uids[value.uid];
    const s =
      // @ts-ignore
      sentence && "n" in sentence
        ? sentence?.n === "<<<not defined>>>"
          ? ""
          : sentence?.n
        : sentence;
    return `${term?.names?.join(", ")}: ${s}`;
  }

  throw new Error("invalid value");
}
function AdditionalComponent({ additional }: { additional: Additional }) {
  if (!additional) {
    return null;
  }

  const { when, where, by } = additional || {};
  return (
    <>
      {when && (
        <span className="flex items-center">
          <Calendar className="size-4" />
          {forDisplay(when)}
        </span>
      )}
      {where && (
        <span className="flex items-center">
          <MapPin className="size-4" />
          {forDisplay(where)}
        </span>
      )}
      {by && (
        <span className="flex items-center">
          <User className="size-4" />
          {forDisplay(by)}
        </span>
      )}
    </>
  );
}
