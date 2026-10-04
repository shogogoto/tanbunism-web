import AuthGuard from "~/features/auth/AuthGuard";
import Uploader from "~/features/namespace/uploader/Uploader";

export function meta() {
  return [{ title: "インポート | Tanbunism" }];
}

export default function ImportReadingNotes() {
  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-5xl">
        <Uploader autoOpenPicker />
      </div>
    </AuthGuard>
  );
}
