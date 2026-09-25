import {
  BookOpen,
  ChartColumn,
  Folder,
  LogIn,
  Settings,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/shared/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MobileMenu({ open, onOpenChange }: Props) {
  const { isAuthenticated } = useAuth();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>メニュー</SheetTitle>
          <SheetDescription>補助画面とアカウント操作</SheetDescription>
        </SheetHeader>
        <nav className="grid gap-1 p-3" aria-label="その他">
          <MenuLink to="/quiz/list" icon={<Folder />}>
            作成したクイズ
          </MenuLink>
          <MenuLink to="/achievement" icon={<ChartColumn />}>
            学習記録
          </MenuLink>
          <MenuLink to="/docs/toc" icon={<BookOpen />}>
            ドキュメント
          </MenuLink>
          {isAuthenticated ? (
            <MenuLink to="/user/edit" icon={<Settings />}>
              アカウント設定
            </MenuLink>
          ) : (
            <>
              <MenuLink to="/login" icon={<LogIn />}>
                ログイン
              </MenuLink>
              <MenuLink to="/register" icon={<UserPlus />}>
                新規登録
              </MenuLink>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MenuLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
      >
        <span className="text-muted-foreground [&>svg]:size-4">{icon}</span>
        {children}
      </Link>
    </SheetClose>
  );
}
