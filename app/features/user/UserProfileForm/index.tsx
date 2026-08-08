import {
  type SubmissionResult,
  getFormProps,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { useEffect } from "react";
import { Link, useFetcher, useNavigate, useNavigation } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "~/features/auth/AuthProvider";
import ConfirmDialogContent from "~/shared/components/ConfirmDialogContent";
import { Button } from "~/shared/components/ui/button";
import { Dialog, DialogTrigger } from "~/shared/components/ui/dialog";
import { Skeleton } from "~/shared/components/ui/skeleton";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import {
  UserProfileUserProfileUsernameGetResponse,
  userProfileUserProfileUsernameGetResponseDisplayNameOneMax,
  userProfileUserProfileUsernameGetResponseUsernameOneMax,
} from "~/shared/generated/public-user/public-user.zod";
import { usersPatchCurrentUserUserMePatchResponseProfileOneMax } from "~/shared/generated/user/user.zod";
import UploadWidget from "../ImageUploader/UploadWidget";
import {
  useDeleteUploadedImage,
  useOnUploadSuccess,
} from "../ImageUploader/hooks";
import ProfileImage from "../UserProfile/ProfileImage";
import { InputFormControl, TextareaFormControl } from "./controls";

const MAX_DN = userProfileUserProfileUsernameGetResponseDisplayNameOneMax;
const MAX_UN = userProfileUserProfileUsernameGetResponseUsernameOneMax;

export const UserProfileSchema = UserProfileUserProfileUsernameGetResponse.pick(
  {
    display_name: true,
    profile: true,
    username: true,
    avatar_url: true,
  },
)
  // 日本語メッセージに上書き
  .extend({
    display_name: z
      .string()
      .max(MAX_DN, {
        message: `${MAX_DN}文字以下で入力してください。`,
      })
      .optional(),
    username: z
      .string()
      .min(3, { message: "ユーザー名は3文字以上で入力してください。" })
      .max(MAX_UN, {
        message: `ユーザー名は${MAX_UN}文字以下で入力してください。`,
      })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "半角英数字とハイフン、アンダースコアのみが使用できます。",
      })
      .optional(),
    profile: z
      .string()
      .max(usersPatchCurrentUserUserMePatchResponseProfileOneMax, {
        message: `プロフィールは${usersPatchCurrentUserUserMePatchResponseProfileOneMax}文字以下で入力してください。`,
      })
      .optional(),
  });

type UserProfileFormType = z.infer<typeof UserProfileSchema>;

type FetcherData = {
  submission: SubmissionResult<string[]>;
  message?: string;
  user?: UserRead;
};

function UserProfileFormSkeleton() {
  return (
    <div className="p-6 bg-card rounded-lg shadow-lg">
      <div className="flex flex-col items-center space-y-4 mb-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-6 flex flex-col items-center">
        <div className="w-full max-w-sm space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="w-full max-w-sm space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="w-full max-w-sm space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex flex-col w-full max-w-sm gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function UserProfileForm() {
  const { user, mutate, isLoading } = useAuth();
  const fetcher = useFetcher<FetcherData>();
  const lastSubmission = fetcher.data;
  const navigation = useNavigation();

  const [form, fields] = useForm<UserProfileFormType>({
    id: user?.uid, // userの読み込み途中では全てundefinedで初期化されるのを防ぐ
    defaultValue: {
      username: user?.username,
      display_name: user?.display_name,
      profile: user?.profile,
    },
    lastResult: lastSubmission?.submission,
    constraint: getZodConstraint(UserProfileSchema), // HTML5としても制約する
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: UserProfileSchema });
    },
    shouldValidate: "onBlur", // 入力中の不要な再レンダリング抑制
  });

  const navigate = useNavigate();
  useEffect(() => {
    if (lastSubmission?.user) {
      mutate(
        { data: lastSubmission.user, status: 200, headers: new Headers() },
        { revalidate: false },
      );
      toast.success(lastSubmission.message);
      navigate("/home");
    }
  }, [lastSubmission, mutate, navigate]);

  const { onUploadSuccess } = useOnUploadSuccess();
  const { deleteImageAndUpdateUser } = useDeleteUploadedImage();
  const isSubmitting =
    navigation.state === "submitting" || fetcher.state === "submitting";

  if (isLoading || !user?.uid) {
    return <UserProfileFormSkeleton />;
  }

  return (
    <div className="p-6 bg-card rounded-lg shadow-lg">
      <div className="flex flex-col items-center space-y-4 mb-6">
        <UploadWidget publicId={user?.uid} onUploadSuccess={onUploadSuccess}>
          <div>
            <ProfileImage user={user} disableDialog={true} />
          </div>
        </UploadWidget>
        <Dialog>
          <DialogTrigger asChild disabled={!user?.avatar_url}>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive-foreground"
            >
              画像を削除
            </Button>
          </DialogTrigger>
          <ConfirmDialogContent
            title="画像を削除"
            handleClick={deleteImageAndUpdateUser}
          />
        </Dialog>
      </div>

      <fetcher.Form
        action="/user/edit"
        method="patch"
        {...getFormProps(form)}
        className="space-y-6 flex flex-col items-center"
      >
        <InputFormControl
          label="ユーザー名"
          field={fields.username}
          placeholder="ユーザー名"
          disabled={isSubmitting}
        />
        <InputFormControl
          label="表示名"
          field={fields.display_name}
          placeholder="表示名を入力してください"
          disabled={isSubmitting}
        />
        <TextareaFormControl
          label="プロフィール"
          field={fields.profile}
          placeholder="プロフィールを入力してください"
          rows={4}
          maxLength={usersPatchCurrentUserUserMePatchResponseProfileOneMax}
          disabled={isSubmitting}
        />
        <div className="flex flex-col w-full max-w-sm gap-2">
          <Button type="submit" className="w-full">
            {isSubmitting ? "更新中..." : "更新"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/home">ホームに戻る</Link>
          </Button>
          <div className="text-sm text-red-500">{form.errors?.[0]}</div>
        </div>
      </fetcher.Form>
    </div>
  );
}
