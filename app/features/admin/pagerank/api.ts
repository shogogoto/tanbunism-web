const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export interface PageRankSettings {
  max_concurrent_jobs: number;
  max_pending_jobs: number;
  max_nodes: number;
  max_edges: number;
}
export interface PageRankResource {
  uid: string;
  title: string;
  state: "ready" | "missing" | "stale";
  computed_at: string | null;
}
export interface PageRankJob {
  uid: string;
  status: "queued" | "running" | "completed" | "partial";
  total: number;
  completed: number;
  current_title: string | null;
  results: { resource_id: string; title: string; error: string | null }[];
}

export async function pageRankRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin/pagerank/${path}`, {
    credentials: "include",
    method,
    ...(body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  if (!response.ok) {
    let message = "PageRankの操作に失敗しました。";
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
    } catch {
      // A proxy may return HTML rather than JSON.
    }
    throw new Error(message);
  }
  return response.json();
}
