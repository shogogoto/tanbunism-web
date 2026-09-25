export type UploadResult = {
  ok: boolean;
  message?: string;
  details?: string;
  retryable: boolean;
  skipped?: boolean;
};

export type UploadHistoryRecord = UploadResult & {
  path: string;
  size: number;
  lastModified: number;
  recordedAt: number;
};

const STORAGE_KEY = "tanbunism.upload-history";
const MAX_RECORDS = 200;

export function matchesFile(
  record: UploadHistoryRecord,
  file: File,
  path: string,
): boolean {
  return (
    record.path === path &&
    record.size === file.size &&
    record.lastModified === file.lastModified
  );
}

export function loadUploadHistory(): UploadHistoryRecord[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (record): record is UploadHistoryRecord =>
        typeof record === "object" &&
        record !== null &&
        typeof record.path === "string" &&
        typeof record.size === "number" &&
        typeof record.lastModified === "number" &&
        typeof record.ok === "boolean" &&
        typeof record.retryable === "boolean",
    );
  } catch {
    return [];
  }
}

export function saveUploadResult(
  history: UploadHistoryRecord[],
  file: File,
  path: string,
  result: UploadResult,
): UploadHistoryRecord[] {
  const record: UploadHistoryRecord = {
    ...result,
    skipped: false,
    path,
    size: file.size,
    lastModified: file.lastModified,
    recordedAt: Date.now(),
  };
  const next = [record, ...history.filter((item) => item.path !== path)].slice(
    0,
    MAX_RECORDS,
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable in private browsing. Uploading still works.
  }
  return next;
}

export function previousResult(
  history: UploadHistoryRecord[],
  file: File,
  path: string,
): UploadResult | undefined {
  const record = history.find((item) => matchesFile(item, file, path));
  if (!record || record.retryable) return undefined;
  return { ...record, skipped: true };
}
