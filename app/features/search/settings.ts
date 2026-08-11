import {
  SearchByTextTanbunGetType,
  type UserSearchBody,
} from "~/shared/generated/fastAPI.schemas";

export const searchTypes = ["knowledge", "resource", "user"] as const;
export type SearchType = (typeof searchTypes)[number];

export type ResourceOrder = "title" | "updated" | "n_char" | "n_sentence";
export type UserOrder = NonNullable<UserSearchBody["order_by"]>[number];

export type SearchSettings = {
  knowledge: {
    matchType: SearchByTextTanbunGetType;
    desc: boolean;
    weights: {
      detail: number;
      premise: number;
      conclusion: number;
      refer: number;
      referred: number;
    };
  };
  resource: {
    user: string;
    order: ResourceOrder;
    desc: boolean;
  };
  user: {
    order: UserOrder;
    desc: boolean;
  };
};

export const defaultSearchSettings: SearchSettings = {
  knowledge: {
    matchType: SearchByTextTanbunGetType.CONTAINS,
    desc: true,
    weights: {
      detail: 1,
      premise: 1,
      conclusion: 1,
      refer: 1,
      referred: 1,
    },
  },
  resource: { user: "", order: "title", desc: true },
  user: { order: "username", desc: true },
};

const settingParamNames = [
  "match",
  "knowledge_desc",
  "weight_detail",
  "weight_premise",
  "weight_conclusion",
  "weight_refer",
  "weight_referred",
  "resource_user",
  "resource_order",
  "resource_desc",
  "user_order",
  "user_desc",
] as const;

export function readSearchSettings(params: URLSearchParams): SearchSettings {
  const match = params.get("match");
  const resourceOrder = params.get("resource_order");
  const userOrder = params.get("user_order");
  return {
    knowledge: {
      matchType: Object.values(SearchByTextTanbunGetType).includes(
        match as SearchByTextTanbunGetType,
      )
        ? (match as SearchByTextTanbunGetType)
        : defaultSearchSettings.knowledge.matchType,
      desc: readBoolean(params, "knowledge_desc", true),
      weights: {
        detail: readWeight(params, "weight_detail"),
        premise: readWeight(params, "weight_premise"),
        conclusion: readWeight(params, "weight_conclusion"),
        refer: readWeight(params, "weight_refer"),
        referred: readWeight(params, "weight_referred"),
      },
    },
    resource: {
      user: params.get("resource_user") ?? "",
      order: isResourceOrder(resourceOrder) ? resourceOrder : "title",
      desc: readBoolean(params, "resource_desc", true),
    },
    user: {
      order: isUserOrder(userOrder) ? userOrder : "username",
      desc: readBoolean(params, "user_desc", true),
    },
  };
}

export function writeSearchSettings(
  current: URLSearchParams,
  settings: SearchSettings,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const name of settingParamNames) next.delete(name);

  setUnlessDefault(next, "match", settings.knowledge.matchType, "CONTAINS");
  setUnlessDefault(next, "knowledge_desc", settings.knowledge.desc, true);
  setUnlessDefault(next, "weight_detail", settings.knowledge.weights.detail, 1);
  setUnlessDefault(
    next,
    "weight_premise",
    settings.knowledge.weights.premise,
    1,
  );
  setUnlessDefault(
    next,
    "weight_conclusion",
    settings.knowledge.weights.conclusion,
    1,
  );
  setUnlessDefault(next, "weight_refer", settings.knowledge.weights.refer, 1);
  setUnlessDefault(
    next,
    "weight_referred",
    settings.knowledge.weights.referred,
    1,
  );
  setUnlessDefault(next, "resource_user", settings.resource.user, "");
  setUnlessDefault(next, "resource_order", settings.resource.order, "title");
  setUnlessDefault(next, "resource_desc", settings.resource.desc, true);
  setUnlessDefault(next, "user_order", settings.user.order, "username");
  setUnlessDefault(next, "user_desc", settings.user.desc, true);
  return next;
}

function setUnlessDefault(
  params: URLSearchParams,
  name: string,
  value: string | number | boolean,
  defaultValue: string | number | boolean,
) {
  if (value !== defaultValue) params.set(name, String(value));
}

function readBoolean(params: URLSearchParams, name: string, fallback: boolean) {
  const value = params.get(name);
  return value === null ? fallback : value === "true";
}

function readWeight(params: URLSearchParams, name: string) {
  const rawValue = params.get(name);
  if (rawValue === null) return 1;
  const value = Number(rawValue);
  return Number.isInteger(value) && value >= -1 && value <= 5 ? value : 1;
}

function isResourceOrder(value: string | null): value is ResourceOrder {
  return ["title", "updated", "n_char", "n_sentence"].includes(value ?? "");
}

function isUserOrder(value: string | null): value is UserOrder {
  return [
    "username",
    "display_name",
    "n_char",
    "n_sentence",
    "n_resource",
  ].includes(value ?? "");
}
