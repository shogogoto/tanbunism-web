import { parseWithZod } from "@conform-to/zod";
import { type ActionFunctionArgs, redirect } from "react-router";
import { useActionData } from "react-router";
import { toast } from "sonner";
import { registerRegisterAuthRegisterPost } from "~/shared/generated/auth/auth";
import { signInAction } from "../SignIn";
import AuthForm, { authSchema } from "../components/AuthForm";

export async function UserRegisterAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: authSchema });
  if (submission.status !== "success") {
    return submission.reply();
  }
  const res1 = await registerRegisterAuthRegisterPost(submission.value);
  if (res1.status !== 201) {
    return submission.reply({
      formErrors: [`登録に失敗しました: ${res1.data.detail || "不明なエラー"}`],
    });
  }
  const res2 = await signInAction(
    submission.value.email,
    submission.value.password,
  );
  if (res2.status !== 204) {
    return submission.reply({
      formErrors: [
        `ログインに失敗しました: ${JSON.stringify(res2.data) || "不明なエラー"}`,
      ],
    });
  }
  toast.success("登録に成功しました");
  return redirect("/dashboard");
}

export default function SignUpForm() {
  const lastResult = useActionData<typeof UserRegisterAction>();
  return <AuthForm lastResult={lastResult} title="ユーザー登録" />;
}
