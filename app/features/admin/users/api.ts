const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type AdminUserItem = {
  uid: string;
  email: string;
  display_name: string | null;
  username: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created: string;
  resource_count: number;
};

export type AdminResourceItem = {
  uid: string;
  name: string;
  updated_at: string | null;
  sentence_count: number;
};

export type ResourceDeletionImpact = {
  resource_uid: string;
  resource_name: string;
  owner_uid: string;
  owner_email: string;
  sentence_count: number;
  term_count: number;
  quiz_count: number;
  answer_count: number;
  retiring_sentence_count: number;
  deleting_sentence_count: number;
};

export type DeleteAdminResourceResult = {
  resource_uid: string;
  deleted_sentence_count: number;
  retired_sentence_count: number;
};

export type DeleteAdminUserResult = {
  user_id: string;
  deleted_resource_count: number;
  deleted_quiz_count: number;
  deleted_answer_count: number;
};

export type UserTransferPreview = {
  source_id: string;
  target_id: string;
  source_email: string;
  target_email: string;
  counts: Record<string, number>;
  blockers: string[];
  preview_token: string;
};

export function previewUserTransfer(
  sourceId: string,
  targetId: string,
): Promise<UserTransferPreview> {
  return request(
    `/admin/users/${encodeURIComponent(sourceId)}/transfer-preview?target_id=${encodeURIComponent(targetId)}`,
  );
}

export function transferUserData(
  sourceId: string,
  body: {
    target_id: string;
    source_confirmation: string;
    target_confirmation: string;
    preview_token: string;
  },
): Promise<UserTransferPreview> {
  return request(`/admin/users/${encodeURIComponent(sourceId)}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listAdminUsers(): Promise<AdminUserItem[]> {
  return request("/admin/users");
}

export function updateAdminUserStatus(
  userId: string,
  isActive: boolean,
): Promise<AdminUserItem> {
  return request(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function resetAdminUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  return request(`/admin/users/${encodeURIComponent(userId)}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export function deleteAdminUser(
  userId: string,
  confirmation: string,
): Promise<DeleteAdminUserResult> {
  return request(`/admin/users/${encodeURIComponent(userId)}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation }),
  });
}

export function listAdminUserResources(
  userId: string,
): Promise<AdminResourceItem[]> {
  return request(`/admin/users/${encodeURIComponent(userId)}/resources`);
}

export function getAdminResourceDeletionImpact(
  resourceId: string,
): Promise<ResourceDeletionImpact> {
  return request(
    `/admin/resources/${encodeURIComponent(resourceId)}/deletion-impact`,
  );
}

export function deleteAdminResource(
  resourceId: string,
  confirmation: string,
): Promise<DeleteAdminResourceResult> {
  return request(`/admin/resources/${encodeURIComponent(resourceId)}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation }),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const body = (await response.json().catch(() => undefined)) as
    | { detail?: string }
    | undefined;
  throw new Error(
    typeof body?.detail === "string"
      ? body.detail
      : "管理操作を実行できませんでした。",
  );
}
