import { type SubmissionResult, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Form, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { RegisterRegisterAuthRegisterPostBody } from "~/shared/generated/auth/auth.zod";
import useShowToggle from "~/shared/hooks/useShowToggle";
import { GoogleAuthButton } from "../sso/google";

export const authSchema = RegisterRegisterAuthRegisterPostBody.pick({
  email: true,
  password: true,
}).extend({
  email: z
    .string({ required_error: "メールアドレスは必須です" })
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string({ required_error: "パスワードは必須です" })
    .min(3, "パスワードは3文字以上で入力してください")
    .max(100, "パスワードは100文字以下で入力してください"),
});

type Props = {
  lastResult: SubmissionResult<string[]> | undefined;
  title: string;
};

export default function AuthForm({ lastResult, title }: Props) {
  const { show, ShowToggleIcon } = useShowToggle();
  const navigation = useNavigation();
  const isSending = navigation.state === "submitting";
  const [form, fields] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: authSchema });
    },
    lastResult,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    constraint: getZodConstraint(authSchema),
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-[380px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <GoogleAuthButton title={`Googleで${title}`} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  または
                </span>
              </div>
            </div>
          </div>
          <Form
            {...form}
            method="post"
            className="space-y-4"
            aria-invalid={form.errors ? true : undefined}
            aria-describedby={form.errors ? form.errorId : undefined}
          >
            <div className="grid gap-2">
              <Label htmlFor={fields.email.id}>メールアドレス</Label>
              <Input
                name={fields.email.name}
                id={fields.email.id}
                placeholder="user@example.com"
                type="email"
                disabled={isSending}
              />
              <div
                className="h-5 text-sm text-red-500"
                id={fields.email.errorId}
              >
                {fields.email.errors?.[0]}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fields.password.id}>パスワード</Label>
              <div className="relative flex items-center">
                <Input
                  name={fields.password.name}
                  id={fields.password.id}
                  type={show ? "text" : "password"}
                  disabled={isSending}
                />
                {ShowToggleIcon}
              </div>
              <div
                className="h-5 text-sm text-red-500"
                id={fields.password.errorId}
              >
                {fields.password.errors?.[0]}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSending}>
              {isSending ? "送信中..." : "送信"}
            </Button>
            <div className="text-sm text-red-500">{form.errors?.[0]}</div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
