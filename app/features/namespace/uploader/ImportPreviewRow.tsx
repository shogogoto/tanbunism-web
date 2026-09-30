import {
  AlertTriangle,
  Check,
  ExternalLink,
  GitCompareArrows,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, badgeVariants } from "~/shared/components/ui/badge";
import type {
  IdentityConflictResponse,
  IdentityResolutionBody,
  ResourceDiffPreview,
} from "~/shared/generated/fastAPI.schemas";
import { cn } from "~/shared/lib/utils";
import type { UploadResult } from "./history";

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
  result?: UploadResult;
  onOpenConflict?: () => void;
};

export function ImportPreviewRow({
  path,
  state,
  result,
  onOpenConflict,
}: Props) {
  return (
    <div className="space-y-2 px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-medium" title={path}>
          {path}
        </p>
        <PreviewStatus
          state={state}
          result={result}
          onOpenConflict={onOpenConflict}
        />
      </div>
      {!result?.ok && state?.status === "ready" && (
        <DiffBadges preview={state.preview} />
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
  result,
  onOpenConflict,
}: {
  state?: PreviewState;
  result?: UploadResult;
  onOpenConflict?: () => void;
}) {
  if (result?.ok) {
    return (
      <ResourceStatusLink resourceId={result.resourceId}>
        <Check /> 変更なし
      </ResourceStatusLink>
    );
  }
  if (result && !result.ok) {
    return (
      <Badge variant="destructive">
        <AlertTriangle /> エラー
      </Badge>
    );
  }
  if (!state) return <Badge variant="outline">未確認</Badge>;
  if (state.status === "checking")
    return (
      <Badge variant="outline">
        <LoaderCircle className="animate-spin" /> 確認中
      </Badge>
    );
  if (state.status === "ready") {
    const hasChanges = diffCount(state.preview) > 0;
    return (
      <ResourceStatusLink resourceId={state.preview.resource_id}>
        {hasChanges ? <RefreshCw /> : <Check />}
        {hasChanges ? "変更あり" : "変更なし"}
      </ResourceStatusLink>
    );
  }
  if (state.status === "conflict")
    return (
      <button
        type="button"
        onClick={onOpenConflict}
        className={cn(
          badgeVariants({ variant: "outline" }),
          "cursor-pointer border-amber-500 text-amber-600 hover:bg-amber-500/10",
        )}
      >
        <GitCompareArrows /> コンフリクト
      </button>
    );
  return (
    <Badge variant="destructive">
      <AlertTriangle /> エラー
    </Badge>
  );
}

function diffCount(preview: ResourceDiffPreview): number {
  return (
    preview.sentences_added +
    preview.sentences_removed +
    preview.sentences_updated +
    preview.terms_added +
    preview.terms_removed +
    preview.terms_updated
  );
}

function ResourceStatusLink({
  resourceId,
  children,
}: {
  resourceId?: string | null;
  children: ReactNode;
}) {
  if (!resourceId) return <Badge variant="secondary">{children}</Badge>;
  return (
    <Badge variant="secondary" asChild>
      <Link to={`/resource/${resourceId}`} title="Resourceを開く">
        {children}
        <ExternalLink />
      </Link>
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
