export const iconFilterKey = "game.icon-picker.filters.v1";
export const recentIconKey = "game.icon-picker.recent.v1";
export const recentIconLimit = 8;
export const defaultIconFilters = { query: "", category: "all", style: "all" };
export type IconFilters = typeof defaultIconFilters;

export function readIconFilters(): IconFilters {
  try {
    const value = JSON.parse(sessionStorage.getItem(iconFilterKey) ?? "null");
    return {
      query: typeof value?.query === "string" ? value.query.slice(0, 200) : "",
      category: [
        "all",
        "enemy",
        "boss",
        "equipment",
        "item",
        "magic",
        "scenery",
        "icon",
      ].includes(value?.category)
        ? value.category
        : "all",
      style: ["all", "illustration", "pixel", "line"].includes(value?.style)
        ? value.style
        : "all",
    };
  } catch {
    return { ...defaultIconFilters };
  }
}
export function writeIconFilters(filters: IconFilters) {
  try {
    sessionStorage.setItem(iconFilterKey, JSON.stringify(filters));
  } catch {
    /* Storage is optional. */
  }
}
export function readRecentIcons(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(recentIconKey) ?? "null",
    );
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(id),
            ),
          ),
        ].slice(0, recentIconLimit)
      : [];
  } catch {
    return [];
  }
}
export function rememberIcon(id: string): string[] {
  const recent = [
    id,
    ...readRecentIcons().filter((previous) => previous !== id),
  ].slice(0, recentIconLimit);
  try {
    localStorage.setItem(recentIconKey, JSON.stringify(recent));
  } catch {
    /* Selection still works without storage. */
  }
  return recent;
}
