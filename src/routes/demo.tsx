/**
 * /demo — Demo role switcher page for investors and reviewers.
 *
 * Allows investors/demo users to quickly switch between roles without
 * needing multiple accounts. Creates demo sessions via the existing
 * auth API (request-otp → verify-otp with devCode) — the underlying
 * mechanism is UNTOUCHED, only the visual presentation is polished.
 *
 * Visible link from Navbar/Footer when DEMO_MODE=true (Phase 1).
 *
 * UX-only gate: the page renders regardless of DEMO_MODE so that
 * reviewer demo sessions aren't broken if the flag is flipped after
 * deployment. The actual demo OTP behavior (returning `devCode` from
 * the API) is enforced server-side in `actions.server.ts` — if
 * DEMO_MODE is false server-side, no devCode is returned and the
 * demo role-switcher buttons will fail gracefully with an error toast.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  Shield,
  Headphones,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Info,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import { ROLE_LABELS } from "@/config/dashboard-nav";
import type { Role } from "@/server/db/schema";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: `دمو | ${site.shortName}` },
      {
        name: "description",
        content:
          "محیط آزمایشی مرکز کارآفرینی بین‌المللی دانشگاه شمال برای سرمایه‌گذاران و بازبینان — ورود سریع با نقش‌های مختلف.",
      },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: DemoPage,
});

/* ------------------------------------------------------------------ */
/* Role definitions                                                    */
/* ------------------------------------------------------------------ */

interface DemoRole {
  role: Role;
  icon: LucideIcon;
  /** Tailwind color family for the card accent. */
  color: "primary" | "gold" | "indigo" | "emerald";
  /** Short description of what this role can do. */
  desc: string;
  /** Fixed demo phone number — must match actions.server.ts demo seeds. */
  phone: string;
}

const DEMO_ROLES: DemoRole[] = [
  {
    role: "student",
    icon: GraduationCap,
    color: "primary",
    desc: "مشاهده دوره‌ها، ثبت‌نام، تیکت پشتیبانی و ثبت‌نام‌های من",
    phone: "09120000001",
  },
  {
    role: "instructor",
    icon: Users,
    color: "gold",
    desc: "ساخت دوره جدید، مدیریت دوره‌ها، کیف‌پول و درآمد",
    phone: "09120000002",
  },
  {
    role: "support",
    icon: Headphones,
    color: "indigo",
    desc: "بررسی درخواست‌های مدرسی، تایید دوره‌ها و پرداخت‌ها، پاسخ به تیکت‌ها",
    phone: "09120000004",
  },
  {
    role: "admin",
    icon: Shield,
    color: "emerald",
    desc: "مدیریت کاربران، آمار سیستم، گزارش فعالیت‌ها و دسترسی کامل",
    phone: "09120000003",
  },
];

const COLOR_CLASSES: Record<
  DemoRole["color"],
  { iconBg: string; ctaHover: string }
> = {
  primary: {
    iconBg: "bg-primary/10 text-primary",
    ctaHover: "hover:bg-primary-hover",
  },
  gold: {
    iconBg: "bg-gold/10 text-gold",
    ctaHover: "hover:bg-gold/90",
  },
  indigo: {
    iconBg: "bg-indigo-100 text-indigo-600",
    ctaHover: "hover:bg-indigo-700",
  },
  emerald: {
    iconBg: "bg-emerald-100 text-emerald-600",
    ctaHover: "hover:bg-emerald-700",
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function DemoPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRoleSelect = async (phone: string, role: Role) => {
    setLoading(role);
    try {
      // Step 1: Request OTP (existing mechanism — untouched)
      const otpRes = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const otpData = await otpRes.json();

      if (!otpRes.ok) throw new Error(otpData.error || "خطا در ارسال کد");

      // Step 2: Get the demo code (only present when DEMO_MODE=true server-side)
      const code = otpData.devCode;
      if (!code) {
        throw new Error(
          "کد دمو دریافت نشد — ممکن است حالت دمو در سرور غیرفعال باشد.",
        );
      }

      // Step 3: Verify OTP (existing mechanism — untouched)
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) throw new Error(verifyData.error || "خطا در تایید کد");

      toast.success(`ورود به عنوان ${ROLE_LABELS[role]}`);

      // Step 4: Navigate to dashboard
      router.invalidate();
      void router.navigate({
        to: "/dashboard/$section",
        params: { section: "my-courses" },
        search: {},
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ورود دمو";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="relative min-h-screen overflow-hidden pt-28 pb-16"
      >
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
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 start-[-8%] size-[400px] rounded-full opacity-[0.04]"
          style={{
            background:
              "radial-gradient(closest-side, var(--gold), transparent 70%)",
          }}
        />

        <Container className="relative max-w-5xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.06] px-4 py-2 text-[12px] font-semibold text-gold backdrop-blur-xl">
              <Sparkles className="size-3.5" />
              محیط دمو — برای سرمایه‌گذاران و بازبینان
            </span>
            <h1 className="mt-5 text-3xl font-extrabold text-foreground md:text-4xl">
              تجربه‌ی پلتفرم با نقش‌های مختلف
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-8 text-paragraph">
              بدون نیاز به ثبت‌نام، یکی از نقش‌های زیر را انتخاب کنید تا به صورت
              خودکار وارد داشبورد متناظر شوید. این یک محیط آزمایشی است و
              داده‌های واقعی تحت تأثیر قرار نمی‌گیرند.
            </p>
          </motion.div>

          {/* Info banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 flex items-start gap-3 rounded-[var(--radius-md)] border border-primary/15 bg-primary/[0.03] p-4"
          >
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm leading-7 text-paragraph">
              <p className="font-semibold text-foreground">
                راهنمای استفاده از دمو
              </p>
              <p className="mt-1">
                با کلیک روی هر نقش، سیستم به صورت خودکار کد تأیید یک‌بار مصرف را
                در محیط دمو تولید و اعمال می‌کند — نیازی به وارد کردن کد نیست.
                برای خروج از حساب، از منوی کاربر (بالا-چپ داشبورد) گزینه‌ی «خروج
                از حساب» را انتخاب کنید.
              </p>
            </div>
          </motion.div>

          {/* Role cards — 4 roles now, not 3 */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_ROLES.map((r, i) => {
              const colors = COLOR_CLASSES[r.color];
              return (
                <motion.div
                  key={r.role}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -6 }}
                >
                  <button
                    type="button"
                    onClick={() => void handleRoleSelect(r.phone, r.role)}
                    disabled={loading !== null}
                    className="flex w-full flex-col items-center rounded-[22px] border border-border bg-white p-6 text-center shadow-card card-premium transition-shadow hover:shadow-premium disabled:opacity-60 disabled:hover:shadow-card"
                    aria-label={`ورود به عنوان ${ROLE_LABELS[r.role]}`}
                  >
                    <div
                      className={`grid size-14 place-items-center rounded-full ${colors.iconBg} pulse-glow-anim`}
                    >
                      <r.icon
                        className="size-7"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-foreground">
                      {ROLE_LABELS[r.role]}
                    </h3>
                    <p className="mt-2 flex-1 text-[12px] leading-6 text-paragraph">
                      {r.desc}
                    </p>
                    <div
                      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-4 py-2.5 text-[13px] font-bold text-white shadow-glow transition-colors ${colors.ctaHover}`}
                    >
                      {loading === r.role ? (
                        <span>در حال ورود...</span>
                      ) : (
                        <>
                          ورود به عنوان {ROLE_LABELS[r.role]}
                          <ArrowLeft className="size-3.5" />
                        </>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Demo phone numbers reference */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 rounded-[var(--radius-md)] border border-border bg-surface/40 p-5"
          >
            <p className="mb-3 text-xs font-semibold text-paragraph">
              شماره موبایل‌های دمو (برای ورود دستی از صفحه‌ی ورود):
            </p>
            <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {DEMO_ROLES.map((r) => (
                <li
                  key={r.role}
                  className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2"
                >
                  <span className="font-medium text-foreground">
                    {ROLE_LABELS[r.role]}
                  </span>
                  <span dir="ltr" className="font-mono text-paragraph">
                    {r.phone}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Notice + back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <div className="flex items-start gap-2 text-xs text-paragraph">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-pending" />
              <p className="max-w-xl text-center leading-6">
                این محیط آزمایشی است و داده‌های واقعی کاربران تحت تأثیر قرار
                نمی‌گیرند. برای مشاهده‌ی دوره‌های واقعی، از{" "}
                <Link
                  to="/courses"
                  className="font-medium text-primary hover:underline"
                >
                  صفحه‌ی دوره‌ها
                </Link>{" "}
                دیدن کنید.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-paragraph transition-colors hover:text-primary"
            >
              بازگشت به صفحه اصلی
              <ArrowLeft className="size-3.5" />
            </Link>
          </motion.div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
