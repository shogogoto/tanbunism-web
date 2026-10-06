import { ChevronRight } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import SentenceQuizActions from "~/features/resource/detail/SentenceQuizActions";
import Loading from "~/shared/components/Loading";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import type {
  MResource,
  Tanbun,
  TanbunChain,
  TanbunLocation,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";
import { useHistory } from "~/shared/history/hooks";
import {
  eqEdgeType,
  operatorGraph,
  pathsToEnd,
  succ,
} from "~/shared/lib/network";
import { cn } from "~/shared/lib/utils";
import LocationView from "../components/LocationView";
import TanbunCard, { TanbunCardContent } from "../components/TanbunCard";
import { DetailContextProvider } from "./DetailContext";
import { canonicalSentenceId } from "./cache";
import { graphForView } from "./util";

type PrefetchedState = {
  tanbun: Tanbun;
  user: UserReadPublic;
  resource: MResource;
};

const colors = {
  detail: {
    in: "border-blue-800",
    out: "border-blue-400",
    bgOut: "bg-blue-50 dark:bg-blue-900",
  },
  logic: {
    in: "border-green-800",
    out: "border-green-400",
    bgIn: "bg-green-100 dark:bg-green-950",
    bgOut: "bg-green-50 dark:bg-green-900",
  },
  ref: {
    in: "border-orange-800",
    out: "border-yellow-400",
    bgIn: "bg-orange-100 dark:bg-orange-950",
    bgOut: "bg-yellow-50 dark:bg-orange-900",
  },
};

function CollapsibleSection({
  title,
  backgroundColor,
  children,
}: {
  title: string;
  backgroundColor?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-1 w-full p-2 rounded-md hover:bg-muted",
          backgroundColor,
        )}
      >
        <ChevronRight
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
        <h3 className="font-bold">{title}</h3>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function RelationSection({
  title,
  borderColor,
  columns = 2,
  children,
}: {
  title: string;
  borderColor: string;
  columns?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className={cn("border-l-4 px-3 text-lg font-bold", borderColor)}>
        {title}
      </h2>
      <div
        className={cn(
          "grid items-start gap-3",
          columns === 2 && "md:grid-cols-2",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function ContextBreadcrumbs({
  location,
  current,
}: {
  location: TanbunLocation;
  current: Tanbun;
}) {
  const quoteContexts = location.quote_contexts ?? [];
  if (quoteContexts.length === 0) return null;

  return (
    <div className="mt-3 space-y-1" aria-label="単文の文脈">
      {quoteContexts.length > 0 && (
        <details open className="group rounded-md bg-muted/40 px-2 py-1">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-muted-foreground">
            <ChevronRight className="size-4 group-open:rotate-90" />
            引用先 {quoteContexts.length}件
          </summary>
          <div className="mt-1 space-y-1 border-l pl-2">
            {quoteContexts.map((context, index) => (
              <LocationView
                key={`${context.resource.uid}-${index}`}
                ariaLabel={`引用先 ${index + 1}の経路`}
                loc={context}
                resourceHref={`/resource/${context.resource.uid}`}
                tanbunId={current.uid}
                current={current}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function oneHopDetailIds(
  g: NonNullable<ReturnType<typeof graphForView>["g"]>,
  belowIds: string[],
) {
  return [
    ...new Set(
      belowIds.flatMap((id) => {
        const paths = pathsToEnd(g, id, eqEdgeType("sibling"), succ);
        return paths.length === 0 ? [id] : paths.flat();
      }),
    ),
  ];
}

function RelatedCards({
  ids,
  kn,
  borderColor,
}: {
  ids: string[];
  kn: (id: string) => Tanbun;
  borderColor: string;
}) {
  return ids.map((id) => (
    <TanbunCard k={kn(id)} key={id} borderColor={borderColor} />
  ));
}
type Props = {
  detail?: TanbunChain;
  prefetched?: PrefetchedState;
  preview?: boolean;
};

export default function MainView({
  detail,
  prefetched,
  preview = false,
}: Props) {
  const {
    headerTanbun,
    headerLocation,
    g,
    kn,
    rootId,
    belows,
    logicOp,
    refOp,
  } = useMemo(() => {
    if (detail) {
      const { root, g, kn, location, rootId } = graphForView(detail);
      const belows = succ(g, rootId, eqEdgeType("below"));
      const logicOp = operatorGraph(g, "to");
      const refOp = operatorGraph(g, "resolved");
      return {
        headerTanbun: root,
        headerLocation: location,
        g,
        kn,
        rootId,
        belows,
        logicOp,
        refOp,
      };
    }
    return {
      headerTanbun: prefetched?.tanbun,
      headerLocation: {
        user: prefetched?.user,
        resource: prefetched?.resource,
      },
      g: null,
      kn: null,
      rootId: null,
      belows: [],
      logicOp: null,
      refOp: null,
    };
  }, [detail, prefetched]);

  if (!headerTanbun) {
    return <Loading type="center-x" />;
  }

  const { addHistory, getTanbunTitle } = useHistory();
  const addedRootIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!kn || !rootId) return;
    if (addedRootIdRef.current === rootId) return;
    void Promise.resolve(
      addHistory({
        title: getTanbunTitle(kn(rootId)),
        url: `/tanbun/${canonicalSentenceId(rootId)}`,
      }),
    ).catch(() => undefined);
    addedRootIdRef.current = rootId; // 今回処理したrootIdを記録
  }, [kn, rootId, addHistory, getTanbunTitle]);

  const logicPred = detail && rootId && logicOp ? logicOp.pred(rootId) : [];
  const logicSucc = detail && rootId && logicOp ? logicOp.succ(rootId) : [];
  const refPred = detail && rootId && refOp ? refOp.pred(rootId) : [];
  const refSucc = detail && rootId && refOp ? refOp.succ(rootId) : [];
  const isLoaded = !!(detail && g && rootId && logicOp && refOp);
  const childIds = isLoaded ? oneHopDetailIds(g, belows) : [];
  const hasLogic = logicPred.length > 0 || logicSucc.length > 0;
  const hasReferences = refPred.length > 0 || refSucc.length > 0;

  const relations = isLoaded ? (
    <div className="space-y-8 px-1 pb-8">
      {childIds.length > 0 && (
        <RelationSection
          title="詳細"
          borderColor={colors.detail.in}
          columns={1}
        >
          <div>
            <CollapsibleSection
              title="子"
              backgroundColor={colors.detail.bgOut}
            >
              <div className="ml-2 space-y-2 border-l-2 border-blue-400 pl-3">
                <RelatedCards
                  ids={childIds}
                  kn={kn}
                  borderColor={colors.detail.out}
                />
              </div>
            </CollapsibleSection>
          </div>
        </RelationSection>
      )}

      {hasLogic && (
        <RelationSection title="論理" borderColor={colors.logic.in}>
          {logicPred.length > 0 && (
            <div>
              <CollapsibleSection
                title="前提"
                backgroundColor={colors.logic.bgIn}
              >
                <RelatedCards
                  ids={logicPred}
                  kn={kn}
                  borderColor={colors.logic.in}
                />
              </CollapsibleSection>
            </div>
          )}
          {logicSucc.length > 0 && (
            <div>
              <CollapsibleSection
                title="結論"
                backgroundColor={colors.logic.bgOut}
              >
                <RelatedCards
                  ids={logicSucc}
                  kn={kn}
                  borderColor={colors.logic.out}
                />
              </CollapsibleSection>
            </div>
          )}
        </RelationSection>
      )}

      {hasReferences && (
        <RelationSection title="参照" borderColor={colors.ref.in}>
          {refSucc.length > 0 && (
            <div>
              <CollapsibleSection
                title="参照している"
                backgroundColor={colors.ref.bgIn}
              >
                <RelatedCards
                  ids={refSucc}
                  kn={kn}
                  borderColor={colors.ref.in}
                />
              </CollapsibleSection>
            </div>
          )}
          {refPred.length > 0 && (
            <div>
              <CollapsibleSection
                title="参照されている"
                backgroundColor={colors.ref.bgOut}
              >
                <RelatedCards
                  ids={refPred}
                  kn={kn}
                  borderColor={colors.ref.out}
                />
              </CollapsibleSection>
            </div>
          )}
        </RelationSection>
      )}
    </div>
  ) : (
    <Loading type="center-x" />
  );

  return (
    <DetailContextProvider
      value={
        headerLocation.user && headerLocation.resource
          ? { user: headerLocation.user, resource: headerLocation.resource }
          : null
      }
    >
      <div
        className={cn(
          "flex flex-col max-w-3xl mx-auto",
          !preview && "min-h-screen",
        )}
      >
        {headerLocation.user && headerLocation.resource && (
          <div className="border-b bg-card/40 p-3">
            <LocationView
              loc={headerLocation as TanbunLocation}
              tanbunId={headerTanbun.uid}
              current={headerTanbun}
            />
            {detail && (
              <ContextBreadcrumbs
                location={headerLocation as TanbunLocation}
                current={headerTanbun}
              />
            )}
            <div className="mt-2 rounded-lg border bg-card py-3 shadow-sm">
              <TanbunCardContent
                k={headerTanbun}
                className="border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium"
              />
              {!preview && (
                <div className="mx-6 mt-3 border-t pt-3">
                  <SentenceQuizActions
                    sentenceId={headerTanbun.uid}
                    resourceId={headerLocation.resource.uid}
                    className="ml-0"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {relations}
      </div>
    </DetailContextProvider>
  );
}
