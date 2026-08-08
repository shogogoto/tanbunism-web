"use client";
import { Suspense } from "react";
import { useLocation } from "react-router";
import Loading from "~/shared/components/Loading";
import type {
  MResource,
  Tanbun,
  TanbunChains,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";
import {
  type detailTanbunSentenceSentenceIdGetResponse200,
  useDetailTanbunSentenceSentenceIdGet,
} from "~/shared/generated/tanbun/tanbun";
import { useCachedSWR } from "~/shared/hooks/swr/useCache";
import { tanbunDetailCache } from "~/shared/lib/indexed";
import MainView from "./MainView";

type Props = {
  id: string;
};

type PrefetchedState = {
  tanbun: Tanbun;
  user: UserReadPublic;
  resource: MResource;
};

export function _TanbunChainView({ id }: Props) {
  const location = useLocation();
  const prefetched = location.state as PrefetchedState | undefined;
  const validPrefetched =
    prefetched?.tanbun.uid === id ? prefetched : undefined;

  const fallbackData = useCachedSWR<
    TanbunChains,
    detailTanbunSentenceSentenceIdGetResponse200 & { headers: Headers }
  >(id, async (cacheId) => {
    const cached = await tanbunDetailCache.get(cacheId);
    return cached ? [cached] : undefined;
  });

  const { data, isLoading } = useDetailTanbunSentenceSentenceIdGet(id, {
    swr: {
      revalidateOnFocus: false,
      keepPreviousData: false,
      fallbackData,
      // suspense: true, // suspenseは使わずisLoadingで制御
      onSuccess: async (data) => {
        if (data.status === 200 && data.data[0]) {
          await tanbunDetailCache.set(data.data[0]);
        }
      },
    },
  });

  const fullDetail =
    data?.status === 200 ? data.data[0] : fallbackData?.data[0];

  if (isLoading && !fullDetail) {
    if (validPrefetched) {
      return (
        <div className="flex flex-col md:flex-row h-screen">
          <div className="flex-1 overflow-y-auto">
            <MainView prefetched={validPrefetched} />
          </div>
        </div>
      );
    }
    return <Loading type="center-x" />;
  }

  if (fullDetail) {
    return (
      <div className="flex flex-col md:flex-row h-screen">
        <div className="flex-1 overflow-y-auto">
          <MainView detail={fullDetail} />
        </div>

        {/* <div className="w-1/4 bg-gray-100 p-4 border-l hidden md:block overflow-y-auto"> */}
        {/* <Suspense fallback={<div>Loading Graph...</div>}> */}
        {/*   <DisplayGraph detail={data.data} /> */}
        {/* </Suspense> */}
        {/* <SideView /> */}
        {/* </div> */}
      </div>
    );
  }

  // TODO: エラーハンドリング
  return <div>{JSON.stringify(data)}</div>;
}

export default function TanbunChainView({ id }: Props) {
  return (
    <Suspense fallback={<Loading type="center-x" />}>
      <_TanbunChainView id={id} />
    </Suspense>
  );
}
