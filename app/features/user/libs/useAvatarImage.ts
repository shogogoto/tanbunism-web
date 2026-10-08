import { useState } from "react";
import { getTransformedImageUrl } from "./image";

// Cloudinary can reject new transformations (e.g. strict transformations).
// Preserve image delivery by retrying the stored URL once per avatar.
export function useAvatarImage(
  url: string | null | undefined,
  width: number,
  height: number,
  crop = "fill",
) {
  const optimized = getTransformedImageUrl(url, width, height, crop);
  const [failedSource, setFailedSource] = useState<string>();
  return {
    src: failedSource === optimized ? url || undefined : optimized,
    onError: () => setFailedSource(optimized),
  };
}
