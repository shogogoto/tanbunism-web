"use client";
import { Suspense } from "react";
import { useLocation } from "react-router";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
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
import { canonicalSentenceId } from "./cache";

type Props = {
  id: string;
  preview?: boolean;
};

type PrefetchedState = {
  tanbun: Tanbun;
  user: UserReadPublic;
  resource: MResource;
};

async function getCachedTanbunChains(cacheId: string) {
  const cached = await tanbunDetailCache.get(cacheId).catch(() => undefined);
  return cached ? [cached] : undefined;
}

export function _TanbunChainView({ id: rawId, preview = false }: Props) {
  const id = canonicalSentenceId(rawId);
  const location = useLocation();
  const prefetched = location.state as PrefetchedState | undefined;
  const validPrefetched =
    prefetched?.tanbun?.uid && canonicalSentenceId(prefetched.tanbun.uid) === id
      ? prefetched
      : undefined;

  const fallbackData = useCachedSWR<
    TanbunChains,
    detailTanbunSentenceSentenceIdGetResponse200 & { headers: Headers }
  >(id, getCachedTanbunChains);

  const { data, error, isLoading, mutate } =
    useDetailTanbunSentenceSentenceIdGet<Error>(id, {
      fetch: { credentials: "include" },
      swr: {
        keepPreviousData: false,
        fallbackData,
        dedupingInterval: 5 * 60_000,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        // suspense: true, // suspenseは使わずisLoadingで制御
        onSuccess: async (data) => {
          if (data.status === 200 && data.data[0]) {
            await tanbunDetailCache.set(data.data[0]).catch(() => undefined);
          }
        },
      },
    });

  const fullDetail =
    data?.status === 200 ? data.data[0] : fallbackData?.data[0];

  if (isLoading && !fullDetail) {
    if (validPrefetched) {
      return (
        <div
          className={preview ? "min-w-0" : "flex flex-col md:flex-row h-screen"}
        >
          <div className="flex-1 overflow-y-auto">
            <MainView prefetched={validPrefetched} preview={preview} />
          </div>
        </div>
      );
    }
    return <Loading type="center-x" />;
  }

  if (fullDetail) {
    return (
      <div
        className={preview ? "min-w-0" : "flex flex-col md:flex-row h-screen"}
      >
        <div className="flex-1 overflow-y-auto">
          <MainView detail={fullDetail} preview={preview} />
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

  return (
    <div className="space-y-3 p-3">
      <p role="alert">単文詳細を取得できませんでした。{error?.message}</p>
      <Button variant="outline" onClick={() => void mutate()}>
        再読み込み
      </Button>
    </div>
  );
}

export default function TanbunChainView({ id, preview }: Props) {
  return (
    <Suspense fallback={<Loading type="center-x" />}>
      <_TanbunChainView
        key={canonicalSentenceId(id)}
        id={id}
        preview={preview}
      />
    </Suspense>
  );
}
