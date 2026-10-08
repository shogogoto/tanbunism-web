import type {
  CloudinaryUploadWidget,
  CloudinaryUploadWidgetError,
  CloudinaryUploadWidgetOptions,
  CloudinaryUploadWidgetResults,
} from "@cloudinary-util/types";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { imageRequest } from "./api";

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: CloudinaryUploadWidgetOptions,
        callback: (
          error: CloudinaryUploadWidgetError | null,
          result: CloudinaryUploadWidgetResults,
        ) => void,
      ) => CloudinaryUploadWidget;
    };
  }
}

const uwConfig: CloudinaryUploadWidgetOptions = {
  cloudName: import.meta.env.VITE_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_UPLOAD_PRESET,
  folder: import.meta.env.VITE_CLOUD_FOLDER || "avatar",
  resourceType: "image",
  sources: ["local", "camera"],
  theme: "minimal",
  showAdvancedOptions: false,
  multiple: false,
  maxFiles: 1,
  // tags: ['users', 'profile'],
  // context: { alt: 'user_uploaded' },
  clientAllowedFormats: ["jpeg", "jpg", "png", "webp"],
  cropping: true,
  // showSkipCropButton: false,
  croppingShowBackButton: true,
  croppingShowDimensions: true,
  croppingValidateDimensions: true,
  autoMinimize: true,
  maxImageFileSize: 5000000,
  maxImageWidth: 1024,
  maxImageHeight: 1024,
  //
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
};

type Props = {
  children: ReactElement;
  publicId: string;
  onUploadSuccess: (imageUrl: string) => void | Promise<void>;
};

export default function UploadWidget({
  children,
  publicId,
  onUploadSuccess,
}: Props) {
  const widgetRef = useRef<CloudinaryUploadWidget | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/latest/global/all.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const openWidget = useCallback(() => {
    if (!uwConfig.cloudName || !uwConfig.apiKey || !uwConfig.uploadPreset) {
      toast.error(
        "画像アップロードの設定が不足しています。フロントエンドのCloud Name・API Key・Upload Presetを確認してください。",
      );
      return;
    }
    widgetRef.current?.open();
  }, []);

  useEffect(() => {
    if (isScriptLoaded && window.cloudinary && !widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          ...uwConfig,
          // prepareUploadParams overrides uploadSignature in Cloudinary's widget.
          // Sign the final parameters here, including the new identity and crop.
          prepareUploadParams: async (
            callback: (params: object | object[]) => void,
            requests: Record<string, unknown> | Record<string, unknown>[],
          ) => {
            try {
              const prepared = await Promise.all(
                (Array.isArray(requests) ? requests : [requests]).map(
                  async (request) => {
                    const uploadId = `${publicId}/${crypto.randomUUID()}`;
                    const params = Object.fromEntries(
                      Object.entries({
                        ...request,
                        public_id: uploadId,
                        overwrite: false,
                        invalidate: true,
                      }).map(([key, value]) => [key, String(value)]),
                    );
                    const { signature } = await imageRequest<{
                      signature: string;
                    }>("/user/avatar/sign", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ params }),
                    });
                    if (!signature || typeof signature !== "string") {
                      throw new Error(
                        "画像アップロードの署名を取得できませんでした",
                      );
                    }
                    return {
                      publicId: uploadId,
                      overwrite: false,
                      invalidate: true,
                      signature,
                    };
                  },
                ),
              );
              callback(prepared.length === 1 ? prepared[0] : prepared);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "画像の署名に失敗しました",
              );
              // Never continue as an unsigned upload when signing fails.
              callback({ cancel: true });
            }
          },
        },
        (error, result) => {
          if (!error && result?.event === "success") {
            const { info } = result;
            const {
              coordinates,
              public_id: newPublicId,
              version,
              format,
            } = info as {
              coordinates?: { custom: number[][] };
              public_id: string;
              version: number;
              secure_url: string;
              format: string;
            };

            let uploadedImageUrl: string;
            if (coordinates?.custom) {
              const [coord] = coordinates.custom;
              const [x, y, width, height] = coord;
              uploadedImageUrl = `https://res.cloudinary.com/${
                import.meta.env.VITE_CLOUD_NAME
              }/image/upload/c_crop,h_${height},w_${width},x_${x},y_${y}/v${version}/${newPublicId}.${format}`;
            } else {
              uploadedImageUrl = (info as { secure_url: string }).secure_url;
            }
            Promise.resolve(onUploadSuccess(uploadedImageUrl)).catch(() => {
              toast.error(
                "画像の保存に失敗しました。未使用の画像は後で削除されます。",
              );
            });
          } else if (error) {
            console.error("Upload failed:", error);
            toast.error("画像のアップロードに失敗しました");
          }
        },
      );
    }
    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [isScriptLoaded, publicId, onUploadSuccess]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openWidget();
    }
  };

  return (
    <div
      onClick={openWidget}
      onKeyDown={handleKeyDown}
      id="upload_widget"
      className="cursor-pointer"
    >
      {children}
    </div>
  );
}
