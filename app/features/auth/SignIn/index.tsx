import { parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs } from "react-router";
import { redirect, useActionData } from "react-router";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { authCookieLoginAuthCookieLoginPost } from "~/shared/generated/auth/auth";
import { useAuth } from "../AuthProvider";
import AuthForm, { authSchema } from "../components/AuthForm";

export async function signInAction(username: string, password: string) {
  const res = await authCookieLoginAuthCookieLoginPost(
    {
      username: username,
      password: password,
    },
    { credentials: "include" },
  );
  return res;
}

export async function UserSignInAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: authSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }
  const res = await signInAction(
    submission.value.email,
    submission.value.password,
  );
  if (res.status !== 204) {
    return submission.reply({
      formErrors: [
        `ログインに失敗しました: ${JSON.stringify(res.data) || "不明なエラー"}`,
      ],
    });
  }
  toast.success("ロクインしました");
  return redirect("/dashboard");
}

export default function SignInForm() {
  const lastResult = useActionData<typeof UserSignInAction>();
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return <AuthForm lastResult={lastResult} title="ログイン" />;
}
