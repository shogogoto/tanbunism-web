import { toast } from "sonner";
import { useAuth } from "~/features/auth/AuthProvider";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import { imageRequest } from "./api";

export function useOnUploadSuccess() {
  const { mutate } = useAuth();
  async function onUploadSuccess(imageUrl: string) {
    // Avatar-only updates must not run the profile form's empty-field conversion.
    const updated = await imageRequest<UserRead>("/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: imageUrl }),
    });
    await mutate(
      { data: updated, status: 200, headers: new Headers() },
      { revalidate: false },
    );
    toast.success("画像を更新しました");
  }

  return { onUploadSuccess };
}

export function useDeleteUploadedImage() {
  const { user, mutate } = useAuth();

  async function deleteImageAndUpdateUser() {
    if (user?.avatar_url) {
      try {
        await imageRequest("/user/avatar", { method: "DELETE" });
      } catch (error) {
        toast.error("画像の削除に失敗しました");
        throw error;
      }

      const u = { ...user, avatar_url: "" } as UserRead;
      mutate(
        { data: u, status: 200, headers: new Headers() },
        { revalidate: false },
      );
      toast.success("画像を削除しました");
    }
  }

  return { deleteImageAndUpdateUser };
}
