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
    const urlParts = url.split("/upload/");
    if (urlParts.length !== 2) {
      console.warn("URL does not appear to be a Cloudinary URL:", url);
      return url;
    }
    const publicIdAndFormat = urlParts[1].split("/").pop(); // publicId.ext
    const pathSegments = urlParts[1].split("/");

    // 'v123456789/' のようなバージョンセグメントを考慮してpublicIdを取得
    let publicIdIndex =
      pathSegments.findIndex((segment) => segment.startsWith("v")) + 1;
    if (publicIdIndex === 0) publicIdIndex = 0; // バージョンがない場合
    const publicId = pathSegments.slice(publicIdIndex).join("/");

    // publicId の末尾に拡張子が含まれる場合があるため、変換パラメータの後に publicId を追加
    // 例: upload/w_100,h_100,c_fill/my_folder/my_image.jpg
    return `${urlParts[0]}/upload/w_${width},h_${height},c_${crop}/${publicId}`;
  } catch (e) {
    console.error("Failed to transform Cloudinary URL:", e);
    return url; // エラー時は元のURLを返す
  }
}
