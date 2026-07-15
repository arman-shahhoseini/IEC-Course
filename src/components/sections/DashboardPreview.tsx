/**
 * DashboardPreview — homepage section showing what the dashboard looks
 * like per role.
 *
 * Two render modes (the same component handles both):
 *
 *   1. **Guest** → 3 role-tabbed cards. Each card links to that role's
 *      FIRST dashboard section via `getSectionRoute()` — NOT a generic
 *      `/dashboard` link (this was §2.4's finding: every role-card
 *      pointed to the same generic URL regardless of which role was
 *      clicked).
 *
 *   2. **Authenticated** → a personalized mini-summary showing the
 *      user's REAL counts (active courses, open tickets) via
 *      `getHomepagePreview()`. No fabricated numbers — if a count is
 *      zero, we show zero. The CTA button still links to the user's
 *      first dashboard section.
 *
 * Data sources:
 *   - `getHomepagePreview()` (new in Phase 3) — returns null when
 *     unauthenticated or DB-unavailable; both cases fall back to the
 *     guest view.
 *   - `getNavForRole()` / `getSectionRoute()` from dashboard-nav.ts —
 *     resolves the correct first section per role.
 *
 * Accessibility:
 *   - Each card is a `<Link>` for guests (whole card clickable).
 *   - Authed summary uses semantic `<dl>` for the stat list.
 *   - Role icons have `aria-hidden` (decorative).
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  Shield,
  ArrowLeft,
  BookOpen,
  Ticket,
  Sparkles,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { stagger, viewportOnce, fadeUp } from "@/lib/motion";
import {
  getNavForRole,
  getSectionRoute,
  ROLE_LABELS,
} from "@/config/dashboard-nav";
import type { Role } from "@/server/db/schema";
import {
  getHomepagePreview,
  type HomepagePreview,
} from "@/server/auth/homepage.functions";

/* ------------------------------------------------------------------ */
/* Role card config (guest view)                                      */
/* ------------------------------------------------------------------ */

interface RoleCardDef {
  role: Role;
  icon: LucideIcon;
  /** Tailwind color family — drives accent classes. */
  color: "primary" | "gold" | "indigo";
  /** Feature list shown in the card body — describes what this role sees. */
  features: string[];
}

const ROLE_CARDS: RoleCardDef[] = [
  {
    role: "student",
    icon: GraduationCap,
    color: "primary",
    features: [
      "دوره‌های ثبت‌نام‌شده",
      "پیگیری پیشرفت",
      "ثبت‌نام در دوره‌های جدید",
      "تیکت پشتیبانی",
    ],
  },
  {
    role: "instructor",
    icon: Users,
    color: "gold",
    features: [
      "مدیریت دوره‌های من",
      "ثبت دوره جدید",
      "کیف‌پول و درآمد",
      "آمار دانشجویان",
    ],
  },
  {
    role: "support",
    icon: Headphones,
    color: "indigo",
    features: [
      "بررسی درخواست‌های مدرسی",
      "تایید دوره‌ها",
      "بررسی پرداخت‌ها",
      "پاسخ به تیکت‌ها",
    ],
  },
];

const COLOR_CLASSES: Record<
  RoleCardDef["color"],
  { bg: string; text: string; dot: string }
> = {
  primary: {
    bg: "bg-primary/[0.04]",
    text: "bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  gold: {
    bg: "bg-gold/[0.04]",
    text: "bg-gold/10 text-gold",
    dot: "bg-gold",
  },
  indigo: {
    bg: "bg-indigo-50",
    text: "bg-indigo-100 text-indigo-600",
    dot: "bg-indigo-500",
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function DashboardPreview() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <Container>
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-[12px] font-semibold text-primary backdrop-blur-xl">
            پیش‌نمایش داشبورد
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
            داشبورد مخصوص هر نقش
          </h2>
          <p className="mt-3 text-[15px] leading-8 text-paragraph">
            هر کاربر تجربه‌ای متناسب با نقش خود دارد — دانشجو، مدرس، پشتیبان و
            مدیر، هر کدام پنل اختصاصی خود را می‌بینند.
          </p>
        </Reveal>

        <AuthAwareContent />
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Auth-aware content — switches between guest and authed views        */
/* ------------------------------------------------------------------ */

function AuthAwareContent() {
  const [preview, setPreview] = useState<HomepagePreview | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    void getHomepagePreview()
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        // Any error → treat as guest (null). Homepage must never break.
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state — render the guest skeleton (avoids layout shift).
  if (preview === undefined) {
    return <GuestPreview />;
  }

  // Authed → personalized mini-summary.
  if (preview !== null) {
    return <AuthedPreview preview={preview} />;
  }

  // Guest → 3 role-tabbed cards.
  return <GuestPreview />;
}

/* ------------------------------------------------------------------ */
/* Guest preview — 3 role cards                                        */
/* ------------------------------------------------------------------ */

function GuestPreview() {
  return (
    <motion.div
      variants={stagger(0.1)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      {ROLE_CARDS.map((card) => (
        <RoleCard key={card.role} card={card} />
      ))}
    </motion.div>
  );
}

function RoleCard({ card }: { card: RoleCardDef }) {
  const colors = COLOR_CLASSES[card.color];
  // Resolve the role's first section for the deep-link CTA.
  const firstSection = getNavForRole(card.role)[0]?.section ?? "my-courses";
  const sectionRoute = getSectionRoute(firstSection);

  return (
    <motion.div variants={fadeUp} whileHover={{ y: -6 }}>
      <Link
        {...sectionRoute}
        className="flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-white shadow-card card-premium transition-shadow hover:shadow-premium"
        aria-label={`ورود به داشبورد ${ROLE_LABELS[card.role]}`}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 ${colors.bg}`}>
          <div
            className={`grid size-12 place-items-center rounded-xl ${colors.text}`}
          >
            <card.icon className="size-6" strokeWidth={1.8} aria-hidden />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            داشبورد {ROLE_LABELS[card.role]}
          </h3>
        </div>

        {/* Body — feature list */}
        <div className="flex flex-1 flex-col p-6">
          <ul className="mb-6 flex-1 space-y-2.5">
            {card.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm text-paragraph"
              >
                <span
                  className={`size-1.5 shrink-0 rounded-full ${colors.dot}`}
                  aria-hidden
                />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTA — role-specific deep link */}
          <div className="flex items-center justify-center gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-[13px] font-bold text-white shadow-glow transition-all hover:bg-primary-hover">
            ورود به داشبورد {ROLE_LABELS[card.role]}
            <ArrowLeft className="size-4" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Authed preview — personalized mini-summary with real counts         */
/* ------------------------------------------------------------------ */

function AuthedPreview({ preview }: { preview: HomepagePreview }) {
  const firstSection = getNavForRole(preview.role)[0]?.section ?? "my-courses";
  const sectionRoute = getSectionRoute(firstSection);

  // Stats shown — meaning varies by role (see homepage.functions.ts).
  const stats = [
    {
      icon: BookOpen,
      label: statsLabelForRole(preview.role).courses,
      value: preview.activeCourses,
    },
    {
      icon: Ticket,
      label: statsLabelForRole(preview.role).tickets,
      value: preview.openTickets,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="overflow-hidden rounded-[28px] border border-border bg-white shadow-premium">
        <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
          {/* Left: greeting + stats */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.04] via-white to-gold/[0.03] p-8 md:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 end-[-10%] size-[300px] rounded-full opacity-[0.05]"
              style={{
                background:
                  "radial-gradient(closest-side, var(--primary), transparent 70%)",
              }}
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-primary backdrop-blur-xl">
                <Sparkles className="size-3" />
                خوش آمدید
              </span>
              <h3 className="mt-4 text-2xl font-extrabold text-foreground md:text-3xl">
                پنل {ROLE_LABELS[preview.role]} شما
              </h3>
              <p className="mt-2 text-sm leading-7 text-paragraph">
                خلاصه‌ای از فعالیت‌های اخیر شما در مرکز کارآفرینی بین‌المللی
                دانشگاه شمال. برای مشاهده‌ی جزئیات کامل، وارد پنل خود شوید.
              </p>

              {/* Stats */}
              <dl className="mt-6 grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[18px] border border-border bg-white/80 p-4 backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-2 text-paragraph">
                      <stat.icon className="size-4 text-primary" aria-hidden />
                      <dt className="text-xs font-medium">{stat.label}</dt>
                    </div>
                    <dd className="mt-2 text-3xl font-extrabold text-foreground">
                      {stat.value.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Right: CTA card */}
          <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
            <div className="rounded-[20px] border border-border bg-surface/60 p-5">
              <p className="text-sm font-bold text-foreground">
                ادامه از جایی که گذاشتید
              </p>
              <p className="mt-1.5 text-xs leading-6 text-paragraph">
                برای دسترسی به همه‌ی بخش‌های پنل — دوره‌ها، تیکت‌ها، کیف‌پول و
                تنظیمات — وارد حساب خود شوید.
              </p>
            </div>

            <Link
              {...sectionRoute}
              className="group inline-flex items-center justify-center gap-2 rounded-[16px] bg-primary px-6 py-4 text-[15px] font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.02] btn-shine"
            >
              ورود به پنل من
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </Link>

            {/* Role chips for context */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {(["student", "instructor", "support", "admin"] as Role[])
                .filter((r) => r !== preview.role)
                .slice(0, 3)
                .map((otherRole) => {
                  const otherSection =
                    getNavForRole(otherRole)[0]?.section ?? "my-courses";
                  return (
                    <Link
                      key={otherRole}
                      {...getSectionRoute(otherSection)}
                      className="rounded-full border border-border bg-white/60 px-3 py-1 text-[11px] font-medium text-paragraph transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      پنل {ROLE_LABELS[otherRole]}
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function statsLabelForRole(role: Role): {
  courses: string;
  tickets: string;
} {
  switch (role) {
    case "student":
      return { courses: "دوره‌های ثبت‌نام‌شده", tickets: "تیکت‌های باز" };
    case "instructor":
      return { courses: "دوره‌های منتشرشده", tickets: "تیکت‌های باز" };
    case "support":
      return { courses: "—", tickets: "تیکت‌های واگذارشده" };
    case "admin":
      return { courses: "دوره‌های منتشرشده", tickets: "تیکت‌های باز" };
  }
}
