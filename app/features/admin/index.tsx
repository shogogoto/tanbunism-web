import { useAuth } from "~/features/auth/AuthProvider";
import OrphanedTanbunManager from "./orphanedTanbuns";

export default function Admin() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">確認中…</p>;
  }
  if (!user?.is_superuser) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          この画面を利用する権限がありません。
        </p>
      </div>
    );
  }
  return <OrphanedTanbunManager />;
}
