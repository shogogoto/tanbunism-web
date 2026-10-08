import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";

type UserAvatarUrl = UserReadPublic["avatar_url"];

export function getTransformedImageUrl(
  url: UserAvatarUrl | undefined,
  width: number,
  height: number,
  crop = "fill",
) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com") return url;
    const marker = "/image/upload/";
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return url;
    const prefix = parsed.pathname.slice(0, index + marker.length);
    const path = parsed.pathname.slice(index + marker.length);
    // Append after existing crop transformations, before the version/public ID.
    const segments = path.split("/");
    const version = segments.findIndex((segment) => /^v\\d+$/.test(segment));
    const boundary =
      version >= 0
        ? version
        : segments.findIndex(
            (segment) => !segment.includes(",") && !/^[a-z]+_/.test(segment),
          );
    if (boundary < 0) return url;
    const optimization = `c_${crop},w_${width},h_${height},q_auto,f_auto`;
    const transform = segments.slice(0, boundary);
    if (transform.at(-1) !== optimization) transform.push(optimization);
    parsed.pathname =
      prefix + [...transform, ...segments.slice(boundary)].join("/");
    return parsed.toString();
  } catch {
    return url;
  }
}
