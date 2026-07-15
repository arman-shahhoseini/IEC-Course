/**
 * /dashboard/stats — admin-only system-wide statistics dashboard.
 *
 * Shows real, DB-backed counts (per approved Phase 0 plan):
 *   - Users by role (student/instructor/support/admin) + total
 *   - Courses by status (draft/pending_review/published/rejected)
 *   - Enrollments by status (pending_payment_review/confirmed/rejected)
 *     + total
 *   - Total revenue (sum of credit wallet_transactions tied to an
 *     enrollment — instructor payouts, net of commission, in Tomans)
 *   - Tickets by status (open/in_progress/closed)
 *
 * Zero fabrication — every number comes from a real DB query. If a
 * count is zero, we show zero. If the DB is unavailable, we show an
 * error state with a retry button.
 *
 * Security: admin-only. UX gate here + `requireRole(["admin"])` in
 * `getAdminStats()` server-side.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  BarChart3,
  Users as UsersIcon,
  BookOpen,
  GraduationCap,
  Wallet,
  Ticket,
  RefreshCw,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import { ROLE_LABELS } from "@/config/dashboard-nav";
import type { Role } from "@/server/db/schema";
import { getAdminStats, type AdminStats } from "@/server/auth/admin.functions";

export const Route = createFileRoute("/dashboard/_panel/stats")({
  head: () => ({
    meta: [{ title: `آمار سیستم | ${site.shortName}` }],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network error — navigate away regardless.
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminStats();
      setStats(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری آمار.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (auth.user.role !== "admin") {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="stats"
        title="آمار سیستم"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <EmptyState
            icon={BarChart3}
            title="دسترسی محدود"
            description="این بخش فقط برای مدیر قابل دسترس است."
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={auth.user}
      currentSection="stats"
      title="آمار سیستم"
      subtitle="نمای کلی از وضعیت پلتفرم — همه‌ی اعداد واقعی هستند"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          به‌روزرسانی
        </Button>
      }
      onLogout={handleLogout}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <EmptyState
            icon={AlertCircle}
            title="بارگذاری آمار ناموفق بود"
            description={error}
            action={
              <Button onClick={() => void load()}>
                <RefreshCw className="size-4" />
                تلاش دوباره
              </Button>
            }
          />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Top row: 4 summary stat cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={UsersIcon}
              label="کل کاربران"
              value={stats.totalUsers}
              color="primary"
            />
            <StatCard
              icon={BookOpen}
              label="دوره‌های منتشرشده"
              value={stats.coursesByStatus.published}
              color="gold"
            />
            <StatCard
              icon={GraduationCap}
              label="کل ثبت‌نام‌ها"
              value={stats.totalEnrollments}
              color="indigo"
            />
            <StatCard
              icon={Wallet}
              label="کل پرداخت‌ها (تومان)"
              value={stats.totalRevenue}
              color="success"
              isCurrency
            />
          </div>

          {/* Users by role */}
          <DetailCard
            icon={UsersIcon}
            title="کاربران بر اساس نقش"
            subtitle="توزیع کاربران فعال و غیرفعال بر اساس نقش"
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(["student", "instructor", "support", "admin"] as Role[]).map(
                (role) => (
                  <RoleCount
                    key={role}
                    label={ROLE_LABELS[role]}
                    value={stats.usersByRole[role]}
                  />
                ),
              )}
            </div>
          </DetailCard>

          {/* Courses by status */}
          <DetailCard
            icon={BookOpen}
            title="دوره‌ها بر اساس وضعیت"
            subtitle="وضعیت چرخه‌ی عمر دوره‌ها در سیستم"
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatusCount
                label="پیش‌نویس"
                value={stats.coursesByStatus.draft}
                variant="draft"
              />
              <StatusCount
                label="در انتظار بررسی"
                value={stats.coursesByStatus.pending_review}
                variant="pending"
              />
              <StatusCount
                label="منتشرشده"
                value={stats.coursesByStatus.published}
                variant="success"
              />
              <StatusCount
                label="رد شده"
                value={stats.coursesByStatus.rejected}
                variant="rejected"
              />
            </div>
          </DetailCard>

          {/* Enrollments by status */}
          <DetailCard
            icon={GraduationCap}
            title="ثبت‌نام‌ها بر اساس وضعیت"
            subtitle="وضعیت ثبت‌نام‌ها در فرآیند بررسی پرداخت"
          >
            <div className="grid grid-cols-3 gap-3">
              <StatusCount
                label="در انتظار بررسی"
                value={stats.enrollmentsByStatus.pending_payment_review}
                variant="pending"
              />
              <StatusCount
                label="تأییدشده"
                value={stats.enrollmentsByStatus.confirmed}
                variant="success"
              />
              <StatusCount
                label="رد شده"
                value={stats.enrollmentsByStatus.rejected}
                variant="rejected"
              />
            </div>
          </DetailCard>

          {/* Tickets by status */}
          <DetailCard
            icon={Ticket}
            title="تیکت‌ها بر اساس وضعیت"
            subtitle="وضعیت تیکت‌های پشتیبانی"
          >
            <div className="grid grid-cols-3 gap-3">
              <StatusCount
                label="باز"
                value={stats.ticketsByStatus.open}
                variant="pending"
              />
              <StatusCount
                label="در حال پیگیری"
                value={stats.ticketsByStatus.in_progress}
                variant="draft"
              />
              <StatusCount
                label="بسته شده"
                value={stats.ticketsByStatus.closed}
                variant="success"
              />
            </div>
          </DetailCard>
        </div>
      ) : null}
    </DashboardShell>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

type CardColor = "primary" | "gold" | "indigo" | "success";

const COLOR_BG: Record<CardColor, string> = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-gold/10 text-gold",
  indigo: "bg-indigo-100 text-indigo-600",
  success: "bg-status-success/10 text-status-success",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isCurrency = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: CardColor;
  isCurrency?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card transition-shadow hover:shadow-float">
      <div
        className={`grid size-10 place-items-center rounded-xl ${COLOR_BG[color]}`}
      >
        <Icon className="size-5" strokeWidth={2} aria-hidden />
      </div>
      <p className="mt-3 text-xs font-medium text-paragraph">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-foreground">
        {value.toLocaleString("fa-IR")}
        {isCurrency && (
          <span className="ms-1 text-xs font-normal text-paragraph">تومان</span>
        )}
      </p>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-surface text-paragraph">
          <Icon className="size-4.5" strokeWidth={2} aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-xs text-paragraph">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function RoleCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface/50 p-4 text-center">
      <p className="text-xs font-medium text-paragraph">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold text-foreground">
        {value.toLocaleString("fa-IR")}
      </p>
    </div>
  );
}

function StatusCount({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "pending" | "rejected" | "draft";
}) {
  const dotColor = {
    success: "bg-status-success",
    pending: "bg-status-pending",
    rejected: "bg-status-rejected",
    draft: "bg-paragraph/40",
  }[variant];

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface/50 p-4 text-center">
      <div className="mb-1 flex items-center justify-center gap-1.5">
        <span className={`size-1.5 rounded-full ${dotColor}`} aria-hidden />
        <p className="text-xs font-medium text-paragraph">{label}</p>
      </div>
      <p className="text-xl font-extrabold text-foreground">
        {value.toLocaleString("fa-IR")}
      </p>
    </div>
  );
}
