/**
 * /dashboard/my-courses — main dashboard landing page.
 *
 * Shows a clean, modern, role-aware dashboard:
 *   - Student: welcome + stats + quick actions + empty states
 *   - Instructor: welcome + course stats + wallet + quick actions
 *   - Support: welcome + queue stats + quick actions
 *   - Admin: welcome + system stats + quick actions
 *
 * All server calls are wrapped in try/catch — the page ALWAYS renders
 * something, even if the DB is slow or a query fails. Stats degrade
 * to 0 instead of crashing the page.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  PlusCircle,
  BookOpen,
  Wallet,
  Ticket,
  GraduationCap,
  Users,
  CreditCard,
  ScrollText,
  BarChart3,
  UserPlus,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import { ROLE_LABELS, getSectionRoute } from "@/config/dashboard-nav";
import type { Role } from "@/server/db/schema";
import {
  getMyCourses,
  type CoursePublic,
} from "@/server/auth/courses.functions";
import {
  getMyEnrollments,
  getMyWallet,
  type EnrollmentPublic,
  type WalletWithTransactions,
} from "@/server/auth/enrollments.functions";
import {
  getMyTickets,
  type TicketPublic,
} from "@/server/auth/tickets.functions";

export const Route = createFileRoute("/dashboard/_panel/my-courses")({
  head: () => ({
    meta: [{ title: `داشبورد | ${site.shortName}` }],
  }),
  component: MyCoursesPage,
});

function MyCoursesPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network error
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const user = auth.user;

  return (
    <DashboardShell
      user={user}
      currentSection="my-courses"
      title="داشبورد"
      subtitle={`خوش آمدید، ${user.fullName ?? user.email ?? user.phone}`}
      onLogout={handleLogout}
    >
      <DashboardContent role={user.role} userId={user.id} />
    </DashboardShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard content dispatcher                                        */
/* ------------------------------------------------------------------ */

function DashboardContent({ role }: { role: Role; userId: string }) {
  switch (role) {
    case "student":
      return <StudentDashboard />;
    case "instructor":
      return <InstructorDashboard />;
    case "support":
      return <SupportDashboard />;
    case "admin":
      return <AdminDashboard />;
  }
}

/* ------------------------------------------------------------------ */
/* Shared UI helpers                                                   */
/* ------------------------------------------------------------------ */

function WelcomeHeader({ role }: { role: Role }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-border bg-gradient-to-br from-primary/[0.06] via-white to-gold/[0.04] p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 end-[-5%] size-[200px] rounded-full opacity-[0.06]"
        style={{
          background:
            "radial-gradient(closest-side, var(--primary), transparent 70%)",
        }}
      />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-primary">
          <Sparkles className="size-3" />
          {ROLE_LABELS[role]}
        </span>
        <h2 className="mt-3 text-xl font-extrabold text-foreground md:text-2xl">
          به داشبورد خود خوش آمدید
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-paragraph">
          از اینجا می‌توانید دوره‌ها، ثبت‌نام‌ها، تیکت‌ها و تنظیمات خود را
          مدیریت کنید.
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color?: "primary" | "gold" | "indigo" | "emerald" | "rose";
  href?: string;
}

const STAT_COLORS: Record<
  NonNullable<StatCardProps["color"]>,
  { bg: string; text: string }
> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  gold: { bg: "bg-gold/10", text: "text-gold" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
}: StatCardProps) {
  const colors = STAT_COLORS[color];
  return (
    <div className="rounded-[18px] border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-float">
      <div
        className={`grid size-10 place-items-center rounded-xl ${colors.bg} ${colors.text}`}
      >
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <p className="mt-3 text-xs font-medium text-paragraph">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-foreground">
        {typeof value === "number" ? value.toLocaleString("fa-IR") : value}
      </p>
    </div>
  );
}

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  color?: "primary" | "gold" | "indigo" | "emerald";
}

function QuickActionCard({
  icon: Icon,
  label,
  description,
  href,
  color = "primary",
}: QuickActionCardProps) {
  const colors = STAT_COLORS[color];
  return (
    <Link
      to={href as "/dashboard"}
      className="group flex items-center gap-4 rounded-[18px] border border-border bg-white p-4 shadow-card transition-all hover:shadow-float hover:border-primary/20"
    >
      <div
        className={`grid size-11 shrink-0 place-items-center rounded-xl ${colors.bg} ${colors.text} transition-transform group-hover:scale-110`}
      >
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="truncate text-xs text-paragraph">{description}</p>
      </div>
      <ArrowLeft className="size-4 shrink-0 text-paragraph transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Student Dashboard                                                   */
/* ------------------------------------------------------------------ */

function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<EnrollmentPublic[]>([]);
  const [tickets, setTickets] = useState<TicketPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [enr, tix] = await Promise.allSettled([
          getMyEnrollments(),
          getMyTickets(),
        ]);
        if (enr.status === "fulfilled") setEnrollments(enr.value);
        if (tix.status === "fulfilled") setTickets(tix.value);
      } catch {
        // ignore — stats show 0
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const confirmed = enrollments.filter((e) => e.status === "confirmed").length;
  const pending = enrollments.filter(
    (e) => e.status === "pending_payment_review",
  ).length;
  const openTickets = tickets.filter((t) => t.status !== "closed").length;

  return (
    <div className="space-y-6">
      <WelcomeHeader role="student" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="ثبت‌نام‌های من"
          value={loading ? "…" : enrollments.length}
          color="primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="تأییدشده"
          value={loading ? "…" : confirmed}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="در انتظار بررسی"
          value={loading ? "…" : pending}
          color="gold"
        />
        <StatCard
          icon={Ticket}
          label="تیکت‌های باز"
          value={loading ? "…" : openTickets}
          color="indigo"
        />
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <SectionTitle title="دسترسی سریع" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={BookOpen}
            label="مشاهده دوره‌ها"
            description="کاوش در دوره‌های موجود"
            href="/courses"
            color="primary"
          />
          <QuickActionCard
            icon={CreditCard}
            label="ثبت‌نام‌های من"
            description="مشاهده وضعیت ثبت‌نام‌ها"
            href="/dashboard/my-enrollments"
            color="gold"
          />
          <QuickActionCard
            icon={Ticket}
            label="تیکت پشتیبانی"
            description="ارسال یا مشاهده تیکت‌ها"
            href="/dashboard/tickets"
            color="indigo"
          />
        </div>
      </div>

      {/* Recent enrollments */}
      <div className="space-y-3">
        <SectionTitle
          title="ثبت‌نام‌های اخیر"
          action={
            enrollments.length > 0 ? (
              <Link
                to="/dashboard/my-enrollments"
                className="text-xs font-medium text-primary hover:underline"
              >
                مشاهده همه
              </Link>
            ) : undefined
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-[18px] border border-border bg-white p-8 text-center shadow-card">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-surface">
              <BookOpen className="size-6 text-paragraph" />
            </div>
            <p className="text-sm font-medium text-foreground">
              هنوز ثبت‌نامی ندارید
            </p>
            <p className="mt-1 text-xs text-paragraph">
              با ثبت‌نام در دوره‌ها، آن‌ها اینجا نمایش داده می‌شوند.
            </p>
            <Button asChild variant="default" className="mt-4">
              <Link to="/courses">
                مشاهده دوره‌ها
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {enrollments.slice(0, 5).map((enr) => (
              <div
                key={enr.id}
                className="flex items-center gap-3 rounded-[14px] border border-border bg-white p-4 shadow-card"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/[0.06] text-primary">
                  <BookOpen className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {enr.courseTitle}
                  </p>
                  <p className="text-xs text-paragraph">
                    {new Date(enr.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <StatusBadge
                  status={
                    enr.status === "confirmed"
                      ? "success"
                      : enr.status === "rejected"
                        ? "rejected"
                        : "pending"
                  }
                  label={
                    enr.status === "confirmed"
                      ? "تأییدشده"
                      : enr.status === "rejected"
                        ? "رد شده"
                        : "در انتظار"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instructor Dashboard                                                */
/* ------------------------------------------------------------------ */

function InstructorDashboard() {
  const [courses, setCourses] = useState<CoursePublic[]>([]);
  const [wallet, setWallet] = useState<WalletWithTransactions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [crs, wlt] = await Promise.allSettled([
          getMyCourses(),
          getMyWallet(),
        ]);
        if (crs.status === "fulfilled") setCourses(crs.value);
        if (wlt.status === "fulfilled") setWallet(wlt.value);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const published = courses.filter((c) => c.status === "published").length;
  const pendingReview = courses.filter(
    (c) => c.status === "pending_review",
  ).length;
  const balance = wallet?.wallet?.balance ?? 0;

  return (
    <div className="space-y-6">
      <WelcomeHeader role="instructor" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="دوره‌های من"
          value={loading ? "…" : courses.length}
          color="primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="منتشرشده"
          value={loading ? "…" : published}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="در انتظار بررسی"
          value={loading ? "…" : pendingReview}
          color="gold"
        />
        <StatCard
          icon={Wallet}
          label="موجودی کیف‌پول (تومان)"
          value={loading ? "…" : balance.toLocaleString("fa-IR")}
          color="indigo"
        />
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <SectionTitle title="دسترسی سریع" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={PlusCircle}
            label="ثبت دوره جدید"
            description="ایجاد دوره‌ی جدید برای بررسی"
            href="/dashboard/create-course"
            color="primary"
          />
          <QuickActionCard
            icon={Wallet}
            label="کیف‌پول من"
            description="موجودی و تراکنش‌ها"
            href="/dashboard/wallet"
            color="gold"
          />
          <QuickActionCard
            icon={Ticket}
            label="تیکت پشتیبانی"
            description="ارسال یا مشاهده تیکت‌ها"
            href="/dashboard/tickets"
            color="indigo"
          />
        </div>
      </div>

      {/* Course list */}
      <div className="space-y-3">
        <SectionTitle
          title="دوره‌های من"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/create-course">
                <PlusCircle className="size-3.5" />
                دوره جدید
              </Link>
            </Button>
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-[18px] border border-border bg-white p-8 text-center shadow-card">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-surface">
              <BookOpen className="size-6 text-paragraph" />
            </div>
            <p className="text-sm font-medium text-foreground">
              هنوز دوره‌ای ثبت نکرده‌اید
            </p>
            <p className="mt-1 text-xs text-paragraph">
              اولین دوره‌ی خود را ثبت کنید تا پس از تأیید پشتیبان منتشر شود.
            </p>
            <Button asChild variant="default" className="mt-4">
              <Link to="/dashboard/create-course">
                <PlusCircle className="size-4" />
                ثبت اولین دوره
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-3 rounded-[14px] border border-border bg-white p-4 shadow-card"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/[0.06] text-primary">
                  <BookOpen className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {course.title}
                  </p>
                  <p className="text-xs text-paragraph">{course.category}</p>
                </div>
                <StatusBadge
                  status={
                    course.status === "published"
                      ? "success"
                      : course.status === "rejected"
                        ? "rejected"
                        : course.status === "pending_review"
                          ? "pending"
                          : "draft"
                  }
                  label={
                    course.status === "published"
                      ? "منتشرشده"
                      : course.status === "rejected"
                        ? "رد شده"
                        : course.status === "pending_review"
                          ? "در انتظار"
                          : "پیش‌نویس"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Support Dashboard                                                   */
/* ------------------------------------------------------------------ */

function SupportDashboard() {
  return (
    <div className="space-y-6">
      <WelcomeHeader role="support" />

      {/* Quick actions */}
      <div className="space-y-3">
        <SectionTitle title="صف‌های بررسی" />
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickActionCard
            icon={GraduationCap}
            label="درخواست‌های مدرسی"
            description="بررسی درخواست‌های تدریس"
            href="/dashboard/support/instructor-applications"
            color="primary"
          />
          <QuickActionCard
            icon={BookOpen}
            label="بررسی دوره‌ها"
            description="تأیید یا رد دوره‌های جدید"
            href="/dashboard/support/courses"
            color="gold"
          />
          <QuickActionCard
            icon={CreditCard}
            label="بررسی پرداخت‌ها"
            description="تأیید فیش‌های واریزی"
            href="/dashboard/support/payments"
            color="indigo"
          />
          <QuickActionCard
            icon={Ticket}
            label="تیکت‌های پشتیبانی"
            description="پاسخ به تیکت‌های کاربران"
            href="/dashboard/support/tickets"
            color="emerald"
          />
        </div>
      </div>

      {/* Manual enrollment */}
      <div className="space-y-3">
        <SectionTitle title="ابزارها" />
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickActionCard
            icon={UserPlus}
            label="ثبت‌نام دستی"
            description="ثبت‌نام مستقیم کاربر در دوره"
            href="/dashboard/support/manual-enrollment"
            color="primary"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Dashboard                                                     */
/* ------------------------------------------------------------------ */

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <WelcomeHeader role="admin" />

      {/* Quick actions */}
      <div className="space-y-3">
        <SectionTitle title="مدیریت سیستم" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={Users}
            label="مدیریت کاربران"
            description="نقش‌ها و دسترسی‌ها"
            href="/dashboard/users"
            color="primary"
          />
          <QuickActionCard
            icon={BarChart3}
            label="آمار سیستم"
            description="نمای کلی پلتفرم"
            href="/dashboard/stats"
            color="gold"
          />
          <QuickActionCard
            icon={ScrollText}
            label="گزارش فعالیت‌ها"
            description="تاریخچه‌ی عملیات‌ها"
            href="/dashboard/audit-log"
            color="indigo"
          />
        </div>
      </div>

      {/* Support tools */}
      <div className="space-y-3">
        <SectionTitle title="ابزارهای پشتیبانی" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={GraduationCap}
            label="درخواست‌های مدرسی"
            description="بررسی درخواست‌های تدریس"
            href="/dashboard/support/instructor-applications"
            color="primary"
          />
          <QuickActionCard
            icon={BookOpen}
            label="بررسی دوره‌ها"
            description="تأیید یا رد دوره‌ها"
            href="/dashboard/support/courses"
            color="gold"
          />
          <QuickActionCard
            icon={CreditCard}
            label="بررسی پرداخت‌ها"
            description="تأیید فیش‌های واریزی"
            href="/dashboard/support/payments"
            color="indigo"
          />
          <QuickActionCard
            icon={Ticket}
            label="تیکت‌ها"
            description="پاسخ به تیکت‌ها"
            href="/dashboard/support/tickets"
            color="emerald"
          />
          <QuickActionCard
            icon={UserPlus}
            label="ثبت‌نام دستی"
            description="ثبت‌نام مستقیم کاربر"
            href="/dashboard/support/manual-enrollment"
            color="primary"
          />
        </div>
      </div>
    </div>
  );
}
