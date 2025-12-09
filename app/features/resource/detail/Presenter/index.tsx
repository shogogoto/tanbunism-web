import type React from "react";
import { type JSX, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { cn } from "~/shared/lib/utils";
import { useResourceDetail } from "../Context";
import { useTraceMemory } from "../TraceMemory/hooks";
import { getHeadingLevel, toAdjacent } from "../util";
import DefPresenter from "./DefPresenter";
type Props = {
  id: string;
  prefix?: React.ReactNode;
};

const HEADING_PREFIX = /^#+\s*/;

// 単文や見出しをいい感じに表示し分ける
export default function Presenter({ id, prefix }: Props) {
  const { graph, terms, uids, rootId } = useResourceDetail();
  const adj = toAdjacent(id, graph, uids, terms);
  const level = getHeadingLevel(adj.kn.sentence);
  const { register, isRegistered, getNumber } = useTraceMemory();
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const isActive = location.hash === `#${adj.kn.uid}`;

  useEffect(() => {
    if (level === 0) {
      if (!isRegistered(id)) {
        register(id);
        setIsVisible(true);
      }
    }
  }, [id, register, level, isRegistered]);

  if (level > 0) {
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    const headingText = adj.kn.sentence.replace(HEADING_PREFIX, "");
    return <Tag>{headingText}</Tag>;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md p-1",
        isActive &&
          "bg-yellow-100 text-neutral-800 dark:bg-yellow-800/30 dark:text-white",
      )}
    >
      <div id={adj.kn.uid}>
        <DefPresenter adj={adj} prefix={prefix} />
      </div>
    </div>
  );
}
