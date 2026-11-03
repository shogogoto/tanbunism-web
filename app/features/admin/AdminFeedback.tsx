import { toast } from "sonner";

const options = { duration: 4000, closeButton: true };

/** All admin action feedback goes through the same presentation and error handling. */
export const adminFeedback = {
  success(message = "保存しました") {
    toast.success(message, options);
    return message;
  },
  info(message: string) {
    toast.info(message, options);
    return message;
  },
  error(reason: unknown, fallback = "操作に失敗しました。") {
    const detail =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "";
    const message = detail.trim() || fallback;
    toast.error(message, { ...options, duration: 6000 });
    return message;
  },
};

/** Keep a non-visual result marker without announcing a duplicate of the toast. */
export function AdminActionStatus({
  message = "保存しました",
}: { message?: string }) {
  return (
    <output className="sr-only" aria-live="off">
      {message}
    </output>
  );
}
