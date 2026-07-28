import type { PropsWithChildren } from "react";
import { Link } from "react-router";
import { HashLink } from "~/shared/components/HashLink";
import { useSelectPreventLink } from "~/shared/hooks/useSelectPrevent";
import { useResourceDetail } from "./Context";
import type { toAdjacent } from "./util";

const PATTERN = /(\{[^}]*\})/g;

type Props = {
  sentence: string;
  refers: ReturnType<ReturnType<typeof toAdjacent>["refers"]>;
};

// 用語リンクを埋め込んだ単文
export default function RefLinkSentence({ sentence, refers }: Props) {
  const { rootId } = useResourceDetail();
  const parts = sentence.split(PATTERN).filter(Boolean);
  return (
    <>
      {parts.map((part) => {
        const found = refers.find((r) =>
          r.kn.term?.names?.some((n) => part.includes(n)),
        );

        if (found) {
          return (
            <HashLink to={`/resource/${rootId}#${found.kn.uid}`}>
              {part}
            </HashLink>
          );
        }
        return <span key={part}>{part}</span>; // part;
      })}
    </>
  );
}

type Props2 = {
  kn: ReturnType<typeof toAdjacent>["kn"];
} & PropsWithChildren;

export function KnowdeDetailLink({ kn, children }: Props2) {
  const { resource_info } = useResourceDetail();
  const { handleMouseDown, handleClick } = useSelectPreventLink(5); // 5px を閾値とする
  return (
    <Link
      to={`/knowde/${kn.uid}`}
      draggable="false"
      className="!text-inherit"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      id={kn.uid}
      state={{
        knowde: kn,
        resource: resource_info.resource,
        user: resource_info.user,
      }}
    >
      {children}
    </Link>
  );
}
