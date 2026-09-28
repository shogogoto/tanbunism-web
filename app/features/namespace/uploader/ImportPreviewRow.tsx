import {
  AlertTriangle,
  Check,
  FilePlus2,
  GitCompareArrows,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import type {
  IdentityConflictResponse,
  IdentityResolutionBody,
  ResourceDiffPreview,
} from "~/shared/generated/fastAPI.schemas";

export type PreviewState =
  | { status: "checking"; resolutions: IdentityResolutionBody[] }
  | {
      status: "ready";
      preview: ResourceDiffPreview;
      resolutions: IdentityResolutionBody[];
    }
  | {
      status: "conflict";
      conflict: IdentityConflictResponse;
      resolutions: IdentityResolutionBody[];
      isResolving?: boolean;
      error?: string;
    }
  | {
      status: "error";
      message: string;
      details?: string;
      resolutions: IdentityResolutionBody[];
    };

type Props = {
  path: string;
  state?: PreviewState;
  skipped?: boolean;
  onOpenConflict?: () => void;
};

export function ImportPreviewRow({
  path,
  state,
  skipped,
  onOpenConflict,
}: Props) {
  return (
    <div className="space-y-2 px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-medium" title={path}>
          {path}
        </p>
        <PreviewStatus state={state} skipped={skipped} />
      </div>
      {state?.status === "ready" && <DiffBadges preview={state.preview} />}
      {state?.status === "conflict" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenConflict}
        >
          <GitCompareArrows />
          競合を確認
        </Button>
      )}
      {state?.status === "error" && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
          <p>{state.message}</p>
          {state.details && (
            <details className="mt-1 text-xs text-muted-foreground">
              <summary className="cursor-pointer">エラー詳細</summary>
              <pre className="mt-1 whitespace-pre-wrap break-words">
                {state.details}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewStatus({
  state,
  skipped,
}: {
  state?: PreviewState;
  skipped?: boolean;
}) {
  if (skipped)
    return (
      <Badge variant="secondary">
        <Check /> 変更なし
      </Badge>
    );
  if (!state) return <Badge variant="outline">未確認</Badge>;
  if (state.status === "checking")
    return (
      <Badge variant="outline">
        <LoaderCircle className="animate-spin" /> 確認中
      </Badge>
    );
  if (state.status === "ready")
    return (
      <Badge variant={state.preview.is_new ? "default" : "secondary"}>
        {state.preview.is_new ? <FilePlus2 /> : <Check />}
        {state.preview.is_new ? "新規" : "更新可能"}
      </Badge>
    );
  if (state.status === "conflict")
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        <GitCompareArrows /> 要確認
      </Badge>
    );
  return (
    <Badge variant="destructive">
      <AlertTriangle /> エラー
    </Badge>
  );
}

function DiffBadges({ preview }: { preview: ResourceDiffPreview }) {
  const items = [
    ["単文追加", preview.sentences_added],
    ["単文更新", preview.sentences_updated],
    ["単文退役", preview.sentences_removed],
    ["用語追加", preview.terms_added],
    ["用語更新", preview.terms_updated],
    ["用語削除", preview.terms_removed],
  ] as const;
  const changed = items.filter(([, count]) => count > 0);
  if (changed.length === 0) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="size-3" /> 構造上の変更はありません
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {changed.map(([label, count]) => (
        <Badge key={label} variant="outline">
          {label} {count}
        </Badge>
      ))}
    </div>
  );
}
