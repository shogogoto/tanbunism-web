import {
  type ElementDefinition,
  type GameCatalog,
  type SkillDefinition,
  type SkillTemplate,
  normalizeSkill,
} from "~/features/game/catalog";
import { networkFetch } from "~/shared/lib/networkFetch";

export const SKILL_FILE_FORMAT = "tanbunism.skills";
export const SKILL_FILE_VERSION = 5;
export const MAX_SKILL_FILE_BYTES = 1024 * 1024;

export function skillFileText(
  skills: SkillDefinition[],
  skill_templates: SkillTemplate[] = [],
  elements?: ElementDefinition[],
) {
  const normalized = skills.map(normalizeSkill).map((skill) => {
    if (!skill.template_id && !skill.template_ids?.length) return skill;
    const {
      id,
      name,
      icon,
      enabled,
      element,
      animation,
      sound,
      template_id,
      template_ids,
      mp_cost,
    } = skill;
    return {
      id,
      name,
      icon,
      enabled,
      element,
      animation,
      sound,
      template_id,
      template_ids,
      mp_cost,
    };
  });
  const templates = skill_templates.map((template) =>
    template.base_template_id
      ? Object.fromEntries(
          Object.entries(template).filter(([key]) =>
            [
              "id",
              "name",
              "base_template_id",
              "override_fields",
              ...(template.override_fields ?? []),
            ].includes(key),
          ),
        )
      : template,
  );
  return `${JSON.stringify({ format: SKILL_FILE_FORMAT, version: SKILL_FILE_VERSION, skill_templates: templates, skills: normalized, ...(elements ? { elements } : {}) }, null, 2)}\n`;
}

/** Server-side definitions validate enums, ranges, defaults and references. No writes. */
export async function previewSkillFile(
  catalog: GameCatalog,
  document: unknown,
): Promise<GameCatalog> {
  const base =
    import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
  const response = await networkFetch(`${base}/admin/game/skills/preview`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catalog, document }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.detail === "string"
        ? body.detail
        : Array.isArray(body?.detail)
          ? body.detail
              .map(
                (issue: { loc?: (string | number)[]; msg?: string }) =>
                  `${issue.loc?.filter((p) => p !== "body").join(".") ?? "定義"}: ${issue.msg ?? "不正な値"}`,
              )
              .join("\n")
          : response.status === 404
            ? "JSON取り込みAPIが未反映です。サーバーの更新後に再度お試しください。"
            : "スキルのJSONを読み込めませんでした。";
    throw new Error(message);
  }
  return response.json();
}

export function readSkillFile(file: File): Promise<unknown> {
  if (file.size > MAX_SKILL_FILE_BYTES) {
    return Promise.reject(new Error("JSONファイルは1MB以下にしてください。"));
  }
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

export function downloadSkillFile(
  skills: SkillDefinition[],
  templates: SkillTemplate[] = [],
  elements?: ElementDefinition[],
) {
  const url = URL.createObjectURL(
    new Blob([skillFileText(skills, templates, elements)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "tanbunism-skills.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
