import { networkFetch } from "~/shared/lib/networkFetch";

export const MAX_GAME_SETTINGS_FILE_BYTES = 5 * 1024 * 1024;
export type GameSettingsDocument = {
  format: "tanbunism.game-settings";
  version: 1;
  catalog?: Record<string, unknown>;
  balance?: Record<string, unknown>;
  battle?: Record<string, unknown>;
};
export type GameSettingsPreview = {
  revision: string;
  backup: GameSettingsDocument;
  document: GameSettingsDocument;
  changes: { section: string; before: unknown; after: unknown }[];
};
const base = import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
async function request<T>(
  path = "",
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await networkFetch(
    `${base}/admin/game/settings-file${path}`,
    {
      credentials: "include",
      cache: "no-store",
      ...(body !== undefined
        ? {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "ゲーム設定JSONを処理できませんでした。",
    );
  return data;
}
export const exportGameSettings = () => request<GameSettingsDocument>();
export const previewGameSettings = (document: unknown) =>
  request<GameSettingsPreview>("/preview", { document });
export const saveGameSettings = (preview: GameSettingsPreview) =>
  request<GameSettingsDocument>(
    "",
    { document: preview.document, revision: preview.revision },
    "PUT",
  );

export async function readGameSettingsFile(file: File): Promise<unknown> {
  if (file.size > MAX_GAME_SETTINGS_FILE_BYTES)
    throw new Error("JSONファイルは5MB以下にしてください。");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("ファイルを読み込めませんでした。"));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result).replace(/^\uFEFF/, "")));
      } catch {
        reject(new Error("JSONの形式が正しくありません。"));
      }
    };
    reader.readAsText(file);
  });
}
export function downloadGameSettings(
  document: GameSettingsDocument,
  backup = false,
) {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(document, null, 2)}\n`], {
      type: "application/json",
    }),
  );
  const link = window.document.createElement("a");
  link.href = url;
  link.download = backup
    ? `tanbunism-game-settings-backup-${new Date().toISOString().replaceAll(":", "-")}.json`
    : "tanbunism-game-settings.json";
  window.document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
