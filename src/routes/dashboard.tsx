/**
 * /dashboard — Stage 2 entry point.
 *
 * Behavior:
 *   - If the user is already authenticated (session cookie valid + DB
 *     reachable) → redirect to `/dashboard/$section` where $section is
 *     the first visible nav item for their role (default: "my-courses").
 *   - Otherwise → show the OTP login card (same form as Stage 1, kept
 *     intact so the existing dev test flow still works).
 *
 * The OTP form lives OUTSIDE the DashboardShell on purpose — the shell
 * is for authenticated views only; showing a partial shell to a logged-
 * out user would be confusing UX.
 *
 * Auth context is read from `Route.useRouteContext()` — the root
 * `beforeLoad` already injected `auth` from the session cookie on the
 * server side. No client-side fetch round-trip needed.
 */
import { useState, type FormEvent } from "react";
import {
  createFileRoute,
  Link,
  useRouter,
  redirect,
} from "@tanstack/react-router";
import {
  Loader2,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { site } from "@/data/site";
import { getNavForRole, DEFAULT_SECTION } from "@/config/dashboard-nav";
import { useToast } from "@/components/ui/toast";

/* ------------------------------------------------------------------ */
/* Route definition                                                    */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: `داشبورد | ${site.shortName}` },
      {
        name: "description",
        content: "داشبورد کاربری مرکز کارآفرینی بین‌المللی دانشگاه شمال.",
      },
    ],
    links: [{ rel: "canonical", href: "/dashboard" }],
  }),
  // Accept an optional `reason` search param so the `_panel` layout can
  // tell this page WHY the user was redirected here. Currently the only
  // value is `session_invalidated` (set when a user had a session cookie
  // but it no longer matches a DB row — e.g. after a role change).
  //
  // We return `{}` when `reason` is absent so callers don't have to
  // write `search: { reason: undefined }` everywhere — `{}` is enough.
  validateSearch: (search: Record<string, unknown>): { reason?: string } => {
    if (typeof search.reason === "string" && search.reason) {
      return { reason: search.reason };
    }
    return {};
  },
  beforeLoad: ({ context }) => {
    // If already authenticated, jump straight to the panel's default
    // section. This is SSR-side — no flash of the login form for
    // authenticated users who navigate to /dashboard directly.
    //
    // This does NOT cause a redirect loop with `_panel.tsx`'s beforeLoad
    // because `_panel` is a child of this route, but its beforeLoad only
    // redirects UN-authenticated users OUT (to /dashboard). An
    // authenticated user hitting /dashboard gets redirected here to
    // /dashboard/_panel/my-courses, and `_panel`'s beforeLoad is a no-op
    // for them (they're already authenticated).
    if (context.auth) {
      const visibleNav = getNavForRole(context.auth.user.role);
      const firstSection = visibleNav[0]?.section ?? DEFAULT_SECTION;
      throw redirect({
        to: "/dashboard/$section",
        params: { section: firstSection },
        replace: true,
      });
    }
  },
  component: DashboardPage,
});

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Step = "input" | "code";
type Method = "email" | "phone";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data: unknown = null;
  // Try JSON first; fall back to text for non-JSON error responses.
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      /* ignore parse errors */
    }
  } else if (!res.ok) {
    // Non-JSON error response (e.g. HTML error page from middleware).
    // Capture the raw text for debugging.
    try {
      const text = await res.text();
      data = {
        error: `خطای سرور (${res.status}).`,
        rawBody: text.slice(0, 500),
      };
    } catch {
      data = { error: `خطای سرور (${res.status}).` };
    }
  }
  return { status: res.status, data };
}

function errorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    const msg = (data as { error: string }).error;
    // In development, append diagnostic fields if present (helps debug
    // CSRF/DB issues on Vercel).
    if (process.env.NODE_ENV !== "production") {
      const d = data as Record<string, unknown>;
      const extras: string[] = [];
      if (typeof d.receivedOrigin === "string") {
        extras.push(`received: ${d.receivedOrigin}`);
      }
      if (Array.isArray(d.expectedOneOf)) {
        extras.push(`allowed: ${d.expectedOneOf.join(", ")}`);
      }
      if (typeof d.code === "string") {
        extras.push(`code: ${d.code}`);
      }
      if (extras.length > 0) {
        return `${msg} [${extras.join(" | ")}]`;
      }
    }
    return msg;
  }
  return fallback;
}

/**
 * Validate a `redirectTo` value to prevent Open Redirect attacks.
 *
 * Rules:
 *   - Must be a string starting with `/dashboard/`
 *   - Must NOT contain `://` (no protocol-relative URLs like `//evil.com`)
 *   - Must NOT contain a domain (no `evil.com/dashboard/...`)
 *   - Must NOT start with `//` (protocol-relative)
 *
 * Returns the validated path or `null` if invalid.
 */
function validateRedirectTo(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  // Must start with /dashboard/
  if (!raw.startsWith("/dashboard/")) return null;
  // No protocol-relative or absolute URLs
  if (raw.includes("://")) return null;
  if (raw.startsWith("//")) return null;
  // No backslash tricks (browsers normalize \ to /)
  if (raw.includes("\\")) return null;
  return raw;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function DashboardPage() {
  const router = useRouter();
  const { auth } = Route.useRouteContext();
  const { reason } = Route.useSearch();
  const toast = useToast();

  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<false | "request" | "verify">(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState<string | null>(
    reason === "session_invalidated"
      ? "نشست شما به‌دلیل تغییر نقش منقضی شده است. لطفاً دوباره وارد شوید تا نقش جدید شما فعال شود."
      : null,
  );

  if (auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  /* -------------------- Step 1: request OTP -------------------- */
  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);
    setDevCode(null);
    setLoading("request");

    const endpoint =
      method === "email"
        ? "/api/auth/request-email-otp"
        : "/api/auth/request-otp";
    const payload = method === "email" ? { email } : { phone };

    const { status, data } = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (status !== 200) {
      const msg = errorMessage(data, "دریافت کد با خطا مواجه شد.");
      setError(msg);
      toast.error(msg);
      return;
    }

    const devCodeRaw = (data as { devCode?: unknown; demoMode?: boolean })
      .devCode;
    const isDemoMode = (data as { demoMode?: boolean }).demoMode === true;
    if (typeof devCodeRaw === "string") {
      setDevCode(devCodeRaw);
      if (isDemoMode) {
        setShowDemoModal(true);
        setInfo(`کد تأیید شما: ${devCodeRaw}`);
      } else {
        setInfo(
          method === "email"
            ? `کد یک‌بار مصرف در محیط توسعه: ${devCodeRaw}`
            : `کد یک‌بار مصرف در محیط توسعه: ${devCodeRaw} (در محیط تولید از طریق پیامک ارسال می‌شود)`,
        );
      }
    } else {
      setInfo(
        method === "email"
          ? "کد یک‌بار مصرف به ایمیل شما ارسال شد."
          : "کد یک‌بار مصرف به شماره شما پیامک شد.",
      );
    }
    setStep("code");
  };

  const handleCopyCode = () => {
    if (devCode) {
      navigator.clipboard.writeText(devCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  /* -------------------- Step 2: verify OTP -------------------- */
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);
    setLoading("verify");

    const endpoint =
      method === "email"
        ? "/api/auth/verify-email-otp"
        : "/api/auth/verify-otp";
    const payload =
      method === "email"
        ? { email, code, phone: phone || undefined }
        : { phone, code };

    const { status, data } = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (status !== 200) {
      const msg = errorMessage(data, "ورود با خطا مواجه شد.");
      setError(msg);
      toast.error(msg);
      return;
    }

    toast.success("ورود موفقیت‌آمیز بود. در حال انتقال به داشبورد…");

    const search = new URLSearchParams(window.location.search);
    const redirectTo = validateRedirectTo(
      search.get("redirectTo") ?? undefined,
    );

    router.invalidate();
    if (redirectTo) {
      void router.navigate({ to: redirectTo as never });
    } else {
      void router.navigate({
        to: "/dashboard/$section",
        params: { section: DEFAULT_SECTION },
      });
    }
  };

  const switchMethod = (m: Method) => {
    if (m === method) return;
    setMethod(m);
    setStep("input");
    setCode("");
    setError(null);
    setInfo(null);
    setDevCode(null);
  };

  const backToInput = () => {
    setStep("input");
    setCode("");
    setError(null);
    setInfo(null);
    setDevCode(null);
  };

  /* -------------------- Render -------------------- */
  return (
    <>
      <Navbar />
      <main
        id="main"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 pt-24 pb-16"
      >
        {/* Premium animated background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 gradient-mesh"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 end-[-5%] size-[500px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(closest-side, var(--primary), transparent 70%)",
          }}
        />
        <Container className="relative max-w-md">
          <div className="rounded-[var(--radius-card)] glass p-8 shadow-premium md:p-10">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 pulse-glow-anim">
                <ShieldCheck className="size-8 text-primary" strokeWidth={2} />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground">
                ورود به داشبورد
              </h1>
              <p className="mt-2 text-sm text-paragraph">
                {method === "email"
                  ? "با ایمیل خود وارد شوید"
                  : "با شماره موبایل خود وارد شوید"}
              </p>
            </div>

            {/* Method tabs — only show on input step */}
            {step === "input" && (
              <div className="mb-6 flex rounded-[var(--radius-md)] border border-border bg-surface/60 p-1">
                <button
                  type="button"
                  onClick={() => switchMethod("email")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold transition-all ${
                    method === "email"
                      ? "bg-primary text-white shadow-sm"
                      : "text-paragraph hover:text-foreground"
                  }`}
                >
                  <Mail className="size-4" />
                  ایمیل
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod("phone")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold transition-all ${
                    method === "phone"
                      ? "bg-primary text-white shadow-sm"
                      : "text-paragraph hover:text-foreground"
                  }`}
                >
                  <Phone className="size-4" />
                  موبایل
                </button>
              </div>
            )}

            {step === "input" ? (
              /* -------------------- Step 1: input -------------------- */
              <form onSubmit={handleRequestOtp} className="space-y-5">
                {method === "email" ? (
                  <>
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        ایمیل
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-paragraph"
                          strokeWidth={2}
                        />
                        <input
                          id="email"
                          type="email"
                          inputMode="email"
                          dir="ltr"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-white ps-4 pe-10 text-sm text-foreground outline-none transition-colors placeholder:text-paragraph/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="phone-optional"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        شماره موبایل{" "}
                        <span className="text-xs font-normal text-paragraph">
                          (اختیاری — برای پروفایل)
                        </span>
                      </label>
                      <div className="relative">
                        <Phone
                          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-paragraph"
                          strokeWidth={2}
                        />
                        <input
                          id="phone-optional"
                          type="tel"
                          inputMode="tel"
                          dir="ltr"
                          autoComplete="tel"
                          placeholder="09123456789"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-white ps-4 pe-10 text-sm text-foreground outline-none transition-colors placeholder:text-paragraph/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      شماره موبایل
                    </label>
                    <div className="relative">
                      <Phone
                        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-paragraph"
                        strokeWidth={2}
                      />
                      <input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel"
                        placeholder="09123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        pattern="^(\+98|0098|98|0)?9\d{9}$"
                        className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-white ps-4 pe-10 text-sm text-foreground outline-none transition-colors placeholder:text-paragraph/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p
                    role="alert"
                    className="rounded-[var(--radius-sm)] bg-primary/5 px-3 py-2 text-sm text-primary"
                  >
                    {error}
                  </p>
                )}

                {info && step === "input" && (
                  <p className="rounded-[var(--radius-sm)] bg-status-pending-bg px-3 py-2 text-xs leading-6 text-status-pending">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading === "request"}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary px-6 text-sm font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.01] btn-shine disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading === "request" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  دریافت کد یک‌بار مصرف
                </button>
              </form>
            ) : (
              /* -------------------- Step 2: code -------------------- */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-[var(--radius-sm)] bg-surface px-3 py-2 text-sm text-paragraph">
                  کد برای{" "}
                  <span dir="ltr" className="font-semibold text-foreground">
                    {method === "email" ? email : phone}
                  </span>{" "}
                  ارسال شد.
                  <button
                    type="button"
                    onClick={backToInput}
                    className="ms-2 text-primary hover:underline"
                  >
                    تغییر {method === "email" ? "ایمیل" : "شماره"}
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="code"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    کد یک‌بار مصرف
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    placeholder="------"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    pattern="\d{6}"
                    autoFocus
                    className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-white px-4 text-center text-lg font-bold tracking-[0.5em] text-foreground outline-none transition-colors placeholder:tracking-normal placeholder:text-paragraph/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {info && (
                  <div className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/[0.04] p-4 text-center">
                    <p className="text-xs font-semibold text-primary">
                      کد تأیید شما
                    </p>
                    <p
                      className="mt-1 text-2xl font-extrabold tracking-[0.3em] text-foreground"
                      dir="ltr"
                    >
                      {devCode ?? info}
                    </p>
                    {devCode && (
                      <button
                        type="button"
                        onClick={() => setCode(devCode)}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        پر کردن خودکار کد
                      </button>
                    )}
                  </div>
                )}
                {error && (
                  <p
                    role="alert"
                    className="rounded-[var(--radius-sm)] bg-primary/5 px-3 py-2 text-sm text-primary"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading === "verify" || code.length !== 6}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary px-6 text-sm font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.01] btn-shine disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading === "verify" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  ورود
                </button>
              </form>
            )}

            {/* Footer link */}
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-xs text-paragraph transition-colors hover:text-primary"
              >
                بازگشت به صفحه اصلی
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />

      {/* Demo OTP Modal — shows the dev code in demo mode.
          Mechanism (request-otp returning devCode) is UNTOUCHED —
          only the visual presentation is polished. */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="max-w-[90vw] overflow-hidden rounded-[24px] p-0 sm:max-w-md">
          {/* Gradient header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-white to-gold/6 px-6 py-8 text-center sm:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-12 end-[-10%] size-[180px] rounded-full opacity-[0.08]"
              style={{
                background:
                  "radial-gradient(closest-side, var(--primary), transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-primary/10 shadow-lg">
                <Mail className="size-8 text-primary" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
                کد تأیید شما
              </h2>
              <p className="mt-2 text-xs leading-6 text-paragraph sm:text-sm">
                کد یک‌بار مصرف برای ورود به حساب کاربری شما
              </p>
            </div>
          </div>

          {/* Code display */}
          <div className="px-6 py-6 sm:px-10">
            <div className="relative overflow-hidden rounded-[18px] border-2 border-primary/15 bg-gradient-to-br from-primary/[0.03] to-gold/[0.02] p-6 text-center sm:p-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                کد یک‌بار مصرف
              </p>
              <p
                className="text-4xl font-black tracking-[0.3em] text-foreground sm:text-5xl"
                dir="ltr"
                style={{
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {devCode}
              </p>
              <p className="mt-3 text-[11px] text-paragraph">
                این کد تا ۲ دقیقه معتبر است
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyCode}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    کپی شد!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    کپی کد
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (devCode) setCode(devCode);
                  setShowDemoModal(false);
                }}
                className="flex-1"
              >
                <ArrowRight className="size-4" />
                پر کردن خودکار
              </Button>
            </div>

            {/* Hint */}
            <p className="mt-4 text-center text-[11px] leading-5 text-paragraph">
              💡 این کد فقط در محیط دمو نمایش داده می‌شود. در محیط تولید، کد به
              ایمیل شما ارسال می‌شود.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
