import type React from "react";
import { createContext, useCallback, useContext } from "react";
import { toast } from "sonner";
import type { KeyedMutator } from "swr";
import { authCookieLogoutAuthCookieLogoutPost } from "~/shared/generated/auth/auth";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import {
  useUsersCurrentUserUserMeGet,
  type usersCurrentUserUserMeGetResponse,
} from "~/shared/generated/user/user";
import { clearPrivateCache } from "~/shared/lib/indexed";
import { easyStorage } from "~/shared/lib/storage";

interface AuthContextT {
  user: UserRead | undefined;
  isLoading: boolean;
  isValidating: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  mutate: KeyedMutator<usersCurrentUserUserMeGetResponse>;
}

export const AuthContext = createContext<AuthContextT | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const USER_CACHE_KEY = "auth-user";
export function AuthProvider({ children }: React.PropsWithChildren) {
  const { getItem, removeItem, setItem } = easyStorage(USER_CACHE_KEY);
  const { data, isLoading, isValidating, mutate } =
    useUsersCurrentUserUserMeGet({
      fetch: { credentials: "include" },
      swr: {
        fallbackData: getItem(),
        errorRetryCount: 3,
        onSuccess: (data) => {
          setItem(data);
        },
      },
    });

  const isAuthenticated = data?.status === 200 && !!data.data;
  const user = data?.data;

  const signOut = useCallback(async () => {
    try {
      await authCookieLogoutAuthCookieLogoutPost({ credentials: "include" });
      await clearPrivateCache();
      await mutate();
      removeItem();
      toast.success("ロクアウトしました");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("ログアウトに失敗しました");
    }
  }, [mutate, removeItem]);

  return (
    <AuthContext.Provider
      value={{
        user: user,
        isLoading,
        isValidating,
        signOut,
        isAuthenticated,
        mutate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
