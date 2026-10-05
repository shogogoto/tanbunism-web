const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type OrphanReason =
  | "missing_resource"
  | "missing_owner"
  | "missing_location";

export type TanbunIntegrityKind = "orphaned" | "misplaced";

export type OrphanedTanbun = {
  uid: string;
  sentence: string;
  resource_uid: string | null;
  resource_name: string | null;
  owner_email: string | null;
  reason: OrphanReason;
  quiz_reference_count: number;
  answer_reference_count: number;
  relationship_count: number;
};

export type DeleteOrphanedTanbunsResult = {
  deleted_count: number;
  retired_count: number;
  skipped_count: number;
};

export async function listOrphanedTanbuns(
  kind: TanbunIntegrityKind,
): Promise<OrphanedTanbun[]> {
  return request<OrphanedTanbun[]>(
    `/admin/orphaned-tanbuns?kind=${encodeURIComponent(kind)}`,
  );
}

export async function deleteOrphanedTanbuns(
  sentenceIds: string[],
  kind: TanbunIntegrityKind,
): Promise<DeleteOrphanedTanbunsResult> {
  return request<DeleteOrphanedTanbunsResult>(
    "/admin/orphaned-tanbuns/delete",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence_ids: sentenceIds, kind }),
    },
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });
  if (response.ok) return (await response.json()) as T;

  const body = (await response.json().catch(() => undefined)) as
    | { detail?: string }
    | undefined;
  throw new Error(
    typeof body?.detail === "string"
      ? body.detail
      : "孤立単文を操作できませんでした。",
  );
}
