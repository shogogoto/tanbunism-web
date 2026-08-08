import { ArrowUpCircle, ChevronRight } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Loading from "~/shared/components/Loading";
import QueryParamTabPage, {
  type QueryParamTabItem,
} from "~/shared/components/tabs/QueryParamTabPage";
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
import { eqEdgeType, operatorGraph, succ } from "~/shared/lib/network";
import { cn } from "~/shared/lib/utils";
import LocationView from "../components/LocationView";
import { TanbunCardContent, createStatView } from "../components/TanbunCard";
import { DetailContextProvider } from "./DetailContext";
import DetailNested from "./TanbunGroup";
import Parents from "./TanbunGroup/Parents";
import TanbunGroup2 from "./TanbunGroup/TanbunGroup2";
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
    tab: "data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900",
    bgIn: "bg-blue-100 dark:bg-blue-950",
    bgOut: "bg-blue-50 dark:bg-blue-800",
  },
  logic: {
    in: "border-green-800",
    out: "border-green-400",
    tab: "data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900",
    bgIn: "bg-green-100 dark:bg-green-950",
    bgOut: "bg-green-50 dark:bg-green-900",
  },
  ref: {
    in: "border-orange-800",
    out: "border-yellow-400",
    tab: "data-[state=active]:bg-yellow-100 dark:data-[state=active]:bg-yellow-900",
    bgIn: "bg-orange-100 dark:bg-orange-950",
    bgOut: "bg-yellow-50 dark:bg-orange-900",
  },
};

function CollapsibleSection({
  title,
  stat,
  backgroundColor,
  children,
}: {
  title: string;
  stat?: React.ReactNode;
  backgroundColor?: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const validChildren = React.Children.toArray(children).filter(Boolean);
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
        <div className="flex items-center gap-2 font-bold">
          {stat}
          <h3>{title}</h3>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{validChildren}</CollapsibleContent>
    </Collapsible>
  );
}
type Props = {
  detail?: TanbunChain;
  prefetched?: PrefetchedState;
};

export default function MainView({ detail, prefetched }: Props) {
  const {
    headerTanbun,
    headerLocation,
    g,
    kn,
    rootId,
    belows,
    logicOp,
    refOp,
    st,
  } = useMemo(() => {
    if (detail) {
      const { root, g, kn, location, rootId } = graphForView(detail);
      const belows = succ(g, rootId, eqEdgeType("below"));
      const logicOp = operatorGraph(g, "to");
      const refOp = operatorGraph(g, "resolved");
      const st = createStatView(root.stats);
      return {
        headerTanbun: root,
        headerLocation: location,
        g,
        kn,
        rootId,
        belows,
        logicOp,
        refOp,
        st,
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
      st: createStatView(prefetched?.tanbun.stats),
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
    addHistory({ title: getTanbunTitle(kn(rootId)) });
    addedRootIdRef.current = rootId; // 今回処理したrootIdを記録
  }, [kn, rootId, addHistory, getTanbunTitle]);

  const logicPred = detail && rootId && logicOp ? logicOp.pred(rootId) : [];
  const logicSucc = detail && rootId && logicOp ? logicOp.succ(rootId) : [];
  const refPred = detail && rootId && refOp ? refOp.pred(rootId) : [];
  const refSucc = detail && rootId && refOp ? refOp.succ(rootId) : [];

  const isLoaded = !!(detail && g && rootId && logicOp && refOp);

  const items: QueryParamTabItem[] = [
    {
      param: "detail",
      className: colors.detail.tab,
      tab: (
        <>
          詳細
          {st.detail}
        </>
      ),
      content: (
        <>
          <CollapsibleSection
            title="親"
            stat={<ArrowUpCircle className="size-4" />}
            backgroundColor={colors.detail.bgIn}
          >
            {isLoaded && (
              <Parents
                parents={graphForView(detail).location.parents}
                borderColor={colors.detail.in}
              />
            )}
          </CollapsibleSection>
          <CollapsibleSection
            title="子"
            stat={st.detail}
            backgroundColor={colors.detail.bgOut}
          >
            {isLoaded &&
              belows?.map((bid) => (
                <DetailNested
                  startId={bid}
                  kn={kn}
                  g={g}
                  key={bid}
                  borderColor={colors.detail.out}
                />
              ))}
          </CollapsibleSection>
        </>
      ),
    },
    {
      param: "logic",
      className: colors.logic.tab,
      tab: (
        <>
          {st.premise}
          論理
          {st.conclusion}
        </>
      ),
      content: (
        <>
          <CollapsibleSection
            title="前提"
            stat={st.premise}
            backgroundColor={colors.logic.bgIn}
          >
            {isLoaded &&
              logicPred.map((id) => (
                <TanbunGroup2
                  startId={id}
                  kn={kn}
                  getGroup={logicOp.pred}
                  key={id}
                  borderColor={colors.logic.in}
                />
              ))}
          </CollapsibleSection>
          <CollapsibleSection
            title="結論"
            stat={st.conclusion}
            backgroundColor={colors.logic.bgOut}
          >
            {isLoaded &&
              logicSucc.map((id) => (
                <TanbunGroup2
                  startId={id}
                  kn={kn}
                  getGroup={logicOp.succ}
                  key={id}
                  borderColor={colors.logic.out}
                />
              ))}
          </CollapsibleSection>
        </>
      ),
    },
    {
      param: "ref",
      className: colors.ref.tab,
      tab: (
        <>
          {st.refer}
          参照
          {st.referred}
        </>
      ),
      content: (
        <>
          <CollapsibleSection
            title="参照"
            stat={st.refer}
            backgroundColor={colors.ref.bgIn}
          >
            {isLoaded &&
              refSucc.map((id) => (
                <TanbunGroup2
                  startId={id}
                  kn={kn}
                  getGroup={refOp.succ}
                  key={id}
                  borderColor={colors.ref.in}
                />
              ))}
          </CollapsibleSection>
          <CollapsibleSection
            title="被参照"
            stat={st.referred}
            backgroundColor={colors.ref.bgOut}
          >
            {isLoaded &&
              refPred.map((id) => (
                <TanbunGroup2
                  startId={id}
                  kn={kn}
                  getGroup={refOp.pred}
                  key={id}
                  borderColor={colors.ref.out}
                />
              ))}
          </CollapsibleSection>
        </>
      ),
    },
  ];

  return (
    <DetailContextProvider
      value={
        headerLocation.user && headerLocation.resource
          ? { user: headerLocation.user, resource: headerLocation.resource }
          : null
      }
    >
      <div className="flex flex-col min-h-screen max-w-3xl mx-auto">
        {headerLocation.user && headerLocation.resource && (
          <div className="m-1">
            <LocationView
              loc={headerLocation as TanbunLocation}
              tanbunId={headerTanbun.uid}
            />
            <TanbunCardContent k={headerTanbun} />
          </div>
        )}
        <QueryParamTabPage
          items={items}
          defaultTab="detail"
          isLoading={!isLoaded}
        />
      </div>
    </DetailContextProvider>
  );
}
