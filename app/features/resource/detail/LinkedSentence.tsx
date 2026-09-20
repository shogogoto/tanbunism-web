import type { PropsWithChildren } from "react";
import { Link } from "react-router";
import { HashLink } from "~/shared/components/HashLink";
import { useSelectPreventLink } from "~/shared/hooks/useSelectPrevent";
import { useResourceDetail } from "./Context";
import type { toAdjacent } from "./util";

const PATTERN = /(\{[^}]*\})/g;

type Props = {
  kn: ReturnType<typeof toAdjacent>["kn"];
  sentence: string;
  refers: ReturnType<ReturnType<typeof toAdjacent>["refers"]>;
};

// 用語リンクを埋め込んだ単文
export default function RefLinkSentence({ kn, sentence, refers }: Props) {
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
            <HashLink key={part} to={`/resource/${rootId}#${found.kn.uid}`}>
              {part}
            </HashLink>
          );
        }
        return (
          <TanbunChainLink key={part} kn={kn}>
            {part}
          </TanbunChainLink>
        );
      })}
    </>
  );
}

type Props2 = {
  kn: ReturnType<typeof toAdjacent>["kn"];
} & PropsWithChildren;

export function TanbunChainLink({ kn, children }: Props2) {
  const { resource_info } = useResourceDetail();
  const { handleMouseDown, handleClick } = useSelectPreventLink(5); // 5px を閾値とする
  return (
    <Link
      to={`/tanbun/${kn.uid}`}
      draggable="false"
      className="!text-inherit hover:underline"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      state={{
        tanbun: kn,
        resource: resource_info.resource,
        user: resource_info.user,
      }}
    >
      {children}
    </Link>
  );
}
