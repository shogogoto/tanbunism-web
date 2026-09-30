import AuthGuard from "~/features/auth/AuthGuard";
import Uploader from "~/features/namespace/uploader/Uploader";

export function meta() {
  return [{ title: "読書メモを取り込む | Tanbunism" }];
}

export default function ImportReadingNotes() {
  return (
    <AuthGuard>
      <div className="mx-auto h-[calc(100dvh-3.5rem)] w-full max-w-5xl">
        <Uploader />
      </div>
    </AuthGuard>
  );
}
