import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "~/shared/components/theme/ThemeProvider";
import ThemeScript from "~/shared/components/theme/ThemeScript";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
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
      <AuthProvider>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{message}</CardTitle>
          <CardDescription>{details}</CardDescription>
        </CardHeader>
        {stack && (
          <CardContent>
            <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-gray-800 rounded-md">
              <code>{stack}</code>
            </pre>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
