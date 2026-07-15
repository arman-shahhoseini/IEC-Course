import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { site } from "@/data/site";
import { orgJsonLd, websiteJsonLd, jsonLdScript } from "@/lib/seo";
import { getSessionForRouter } from "@/server/auth/auth.functions";
import type { RouterContext } from "@/router";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/shared/components/ThemeProvider";

function NotFoundComponent() {
  return (
    <>
      <Navbar />
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 gradient-mesh"
        />
        <div className="relative max-w-md text-center">
          <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-primary/10 pulse-glow-anim">
            <span className="text-4xl font-extrabold text-primary">۴۰۴</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            صفحه پیدا نشد
          </h1>
          <p className="mt-3 text-sm leading-7 text-paragraph">
            صفحه‌ی مورد نظر شما وجود ندارد یا جابجا شده است. ممکن است آدرس را
            اشتباه وارد کرده باشید.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.02] btn-shine"
            >
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 gradient-mesh"
      />
      <div className="relative max-w-md text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-status-rejected/10">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-extrabold text-foreground">
          این صفحه بارگذاری نشد
        </h1>
        <p className="mt-3 text-sm leading-7 text-paragraph">
          مشکلی پیش آمد. لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با
          پشتیبانی تماس بگیرید.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.02] btn-shine"
          >
            تلاش دوباره
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-border bg-white/80 px-6 py-3 text-sm font-bold text-foreground backdrop-blur-xl transition-all hover:bg-white"
          >
            صفحه اصلی
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  /**
   * Inject `auth` into the router context for every route.
   *
   * This is UX/SSR only — it lets `DashboardShell` render the correct
   * menu and lets protected routes show a login redirect WITHOUT a
   * client-side fetch round-trip. Server functions that touch private
   * data MUST still call `requireRole()` inside their handler — a
   * malicious client can fabricate any context it wants.
   *
   * Runs on every navigation (client-side, via SSR, and on cold load).
   * When the DB is unavailable, `getActiveSession()` returns `null`
   * and the app degrades gracefully to the logged-out view.
   */
  beforeLoad: async () => {
    const { auth, hadCookie } = await getSessionForRouter();
    return { auth, hadCookie };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#C1121F" },
      { title: `${site.name} | ${site.tagline}` },
      { name: "description", content: site.description },
      { name: "author", content: site.organizer },
      {
        name: "keywords",
        content:
          "دوره مهارتی, دوره آموزشی, کارگاه تخصصی, آموزش کاربردی, مهارت, بازار کار, IEC, آمل",
      },
      { property: "og:site_name", content: site.organizer },
      { property: "og:title", content: site.name },
      { property: "og:description", content: site.description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fa_IR" },
      { property: "og:image", content: "/images/og-default.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: site.name },
      { name: "twitter:description", content: site.description },
      { name: "twitter:image", content: "/images/og-default.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      {
        rel: "apple-touch-icon",
        href: "/images/apple-touch-icon.png",
        sizes: "180x180",
      },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [jsonLdScript(orgJsonLd()), jsonLdScript(websiteJsonLd())],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          پرش به محتوا
        </a>
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
