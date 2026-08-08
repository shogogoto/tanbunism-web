import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useContext, useRef } from "react";
import { Link } from "react-router";
import UserAvatar from "~/features/user/UserAvatar";
import PageContext from "~/shared/components/Pagenation/PageContext";
import { Card } from "~/shared/components/ui/card";
import type {
  MResource,
  Tanbun,
  TanbunSearchResult,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";
import { useDebounce } from "~/shared/hooks/useDebounce";
import {
  TanbunCardContent,
  TanbunCardFooter,
} from "../../components/TanbunCard";
import { useTanbunSearch } from "../SearchContext";

type Props = {
  data: TanbunSearchResult;
};

export default function TanbunSearchResults({ data }: Props) {
  const {
    params: { q },
  } = useTanbunSearch();
  const { current, pageSize } = useContext(PageContext);
  const startIndex = current ? 1 + (current - 1) * pageSize : 1;

  const bouncedQ = useDebounce(q, 500);
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: data.data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 130, // A reasonable estimate for item height
    overscan: 5,
  });

  return (
    <div className="container mx-auto">
      <div>
        {data.total > 0 ? (
          <div>
            <h2 className="text-xl font-semibold">検索結果 ({data.total}件)</h2>
            <div ref={parentRef} className="max-w-3xl">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const k = data.data[virtualItem.index];
                  const { user, resource } =
                    data.resource_infos[k.resource_uid];

                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        // 重なって描画されないようにする。リストの仮想化に不可欠
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="flex items-center border-b"
                    >
                      <ResultRow
                        k={k}
                        user={user}
                        resource={resource}
                        index={virtualItem.index + startIndex}
                        query={bouncedQ}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            検索結果はありません
          </div>
        )}
      </div>
    </div>
  );
}

type RowProps = {
  k: Tanbun;
  user: UserReadPublic;
  resource: MResource;
  index: number;
  query?: string;
};

const ResultRow = React.memo(
  ({ k, user, resource, index, query }: RowProps) => {
    return (
      <>
        {user && (
          <Link
            to={`/user/${user.username}`}
            className="flex w-24 flex-col items-center justify-center space-y-1"
          >
            <UserAvatar user={user} />
            <span className="break-all text-center text-xs font-semibold">
              {user.display_name}
            </span>
            <span className="text-center text-xs text-muted-foreground">
              @{user.username}
            </span>
          </Link>
        )}

        <Card className="flex-1 max-w-2xl">
          <Link to={`/tanbun/${k.uid}`} state={{ tanbun: k, user, resource }}>
            <TanbunCardContent k={k} resource={resource} query={query} />
          </Link>
          <TanbunCardFooter k={k} index={index} />
        </Card>
      </>
    );
  },
);
