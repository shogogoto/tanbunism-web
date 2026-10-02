import { useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import { SWRConfig } from "swr";
import type { Route } from "./+types/root";
import "./app.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "~/shared/components/theme/ThemeProvider";
import ThemeScript from "~/shared/components/theme/ThemeScript";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import { clearApplicationCaches } from "~/shared/lib/indexed";
import GATracker from "./GATracker";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ClientOnly } from "./shared/components/ClientOnly";
import { HashScrollRestoration } from "./shared/components/HashLink";
import { TooltipProvider } from "./shared/components/ui/tooltip";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.json" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-02M34HWF8J"
        />

        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml:
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                // ★ 重要な修正: 自動ページビュー計測を無効化する
                gtag('config', 'G-02M34HWF8J', {
                  send_page_view: false
                });
            `,
          }}
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml:
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PKBJMGBW');`,
          }}
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="google-site-verification"
          content="ytGE3nm0GuzZqCaimeh68mNCtG7hpr3WQG5YCRWq8iY"
        />
        <Meta />
        <Links />
        <ThemeScript />
      </head>
      <body>
        <noscript>
          <iframe
            title="google tag manager"
            src="https://www.googletagmanager.com/ns.html?id=GTM-PKBJMGBW"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export async function loader(args: Route.LoaderArgs) {
  // return rootAuthLoader(args);
  return null;
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ThemeProvider>
      <HashScrollRestoration />
      <ClientOnly>{() => <GATracker />}</ClientOnly>
      <SWRConfig
        value={{
          dedupingInterval: 30_000,
          errorRetryCount: 2,
          revalidateIfStale: true,
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
        }}
      >
        <AuthProvider>
          <TooltipProvider>
            <Outlet />
          </TooltipProvider>
        </AuthProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}

export function isStaleBundleError(error: Error): boolean {
  return /ChunkLoadError|Loading chunk|dynamically imported module|module script failed/i.test(
    error.message,
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const [clearingCache, setClearingCache] = useState(false);
  let message = "Oops!";
  let details = "予期しないエラーが発生しました。";
  let stack: string | undefined;
  let technicalDetails: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "ページが見つかりませんでした。"
        : error.statusText || details;
    technicalDetails = `${error.status} ${error.statusText}`.trim();
  } else if (error instanceof Error) {
    technicalDetails = error.message;
    if (isStaleBundleError(error)) {
      details =
        "更新前のアプリが端末に残っている可能性があります。再読み込みしてください。";
    }
    if (import.meta.env.DEV) {
      details = error.message;
      stack = error.stack;
    }
  }

  const clearCacheAndReload = async () => {
    setClearingCache(true);
    try {
      await clearApplicationCaches();
    } finally {
      window.location.reload();
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{message}</CardTitle>
          <CardDescription>{details}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={clearingCache}
              onClick={clearCacheAndReload}
            >
              {clearingCache
                ? "キャッシュを削除中…"
                : "データキャッシュを消して再読み込み"}
            </Button>
          </div>
          {technicalDetails && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none">技術情報</summary>
              <pre className="w-full p-3 mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-muted rounded-md">
                <code>{technicalDetails}</code>
              </pre>
            </details>
          )}
          {stack && (
            <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-gray-800 rounded-md">
              <code>{stack}</code>
            </pre>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
