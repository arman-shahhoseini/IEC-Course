/**
 * Role Dashboard Overview — renders a role-specific dashboard summary
 * at the top of the landing page.
 *
 * Uses existing server functions (no new backend):
 *   - Student: getMyEnrollments, getMyTickets
 *   - Instructor: getMyCourses, getMyWallet
 *   - Support: listInstructorApplications, listCoursesForReview,
 *              listEnrollmentsForReview, listAllTickets
 *   - Admin: same as support + listAuditLogs
 *
 * Permission-based: Quick Actions and cards use `hasPermission` to
 * conditionally render.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Wallet,
  Inbox,
  CreditCard,
  Ticket,
  GraduationCap,
  PlusCircle,
  UserPlus,
  Users,
  ScrollText,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import type { Role } from "@/server/db/schema";
import { hasPermission } from "@/shared/rbac/permissions";
import { ROLE_LABELS } from "@/config/dashboard-nav";
import {
  StatisticsGrid,
  QuickActions,
  ActivityTimeline,
  StatusCard,
  RealChart,
  ProfileWidget,
  WalletWidget,
  AnnouncementsWidget,
  DashboardSection,
  type StatItem,
  type QuickAction,
  type ActivityItem,
} from "@/shared/components/dashboard-widgets";
import {
  getMyCourses,
  listCoursesForReview,
  type CoursePublic,
} from "@/server/auth/courses.functions";
import {
  getMyEnrollments,
  getMyWallet,
  listEnrollmentsForReview,
  type EnrollmentPublic,
  type WalletWithTransactions,
} from "@/server/auth/enrollments.functions";
import {
  getMyTickets,
  listAllTickets,
  type TicketPublic,
} from "@/server/auth/tickets.functions";
import { listInstructorApplications } from "@/server/auth/instructor-applications.functions";

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function RoleDashboardOverview({
  user,
}: {
  user: {
    id: string;
    phone: string;
    fullName: string | null;
    role: Role;
    isActive: boolean;
  };
}) {
  switch (user.role) {
    case "student":
      return <StudentDashboard user={user} />;
    case "instructor":
      return <InstructorDashboard user={user} />;
    case "support":
      return <SupportDashboard user={user} />;
    case "admin":
      return <AdminDashboard user={user} />;
  }
}

/* ------------------------------------------------------------------ */
/* Student Dashboard                                                   */
/* ------------------------------------------------------------------ */

function StudentDashboard({
  user,
}: {
  user: { id: string; phone: string; fullName: string | null; role: Role };
}) {
  const [enrollments, setEnrollments] = useState<EnrollmentPublic[]>([]);
  const [tickets, setTickets] = useState<TicketPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [enr, tix] = await Promise.all([
          getMyEnrollments(),
          getMyTickets(),
        ]);
        setEnrollments(enr);
        setTickets(tix);
      } catch {
        // ignore — dashboard degrades gracefully
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pending = enrollments.filter(
    (e) => e.status === "pending_payment_review",
  ).length;
  const confirmed = enrollments.filter((e) => e.status === "confirmed").length;
  const openTickets = tickets.filter((t) => t.status !== "closed").length;

  const stats: StatItem[] = [
    {
      label: "ثبت‌نام‌های من",
      value: enrollments.length,
      icon: <BookOpen className="size-5" />,
    },
    {
      label: "تاییدشده",
      value: confirmed,
      icon: <CheckCircle2 className="size-5" />,
    },
    {
      label: "در انتظار بررسی",
      value: pending,
      icon: <Clock className="size-5" />,
    },
    {
      label: "تیکت‌های باز",
      value: openTickets,
      icon: <Ticket className="size-5" />,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "مشاهده دوره‌ها",
      icon: BookOpen,
      href: "/courses",
      variant: "default",
    },
    {
      label: "ثبت‌نام‌های من",
      icon: CreditCard,
      href: "/dashboard/my-enrollments",
      variant: "outline",
    },
    {
      label: "تیکت جدید",
      icon: PlusCircle,
      href: "/dashboard/tickets",
      permission: "ticket.create",
      variant: "outline",
    },
  ];

  const recentEnrollments: ActivityItem[] = enrollments
    .slice(0, 5)
    .map((e) => ({
      action: "enrollment",
      description: `ثبت‌نام در دوره‌ی «${e.courseTitle}»`,
      time: new Date(e.createdAt).toLocaleDateString("fa-IR"),
      icon:
        e.status === "confirmed"
          ? CheckCircle2
          : e.status === "rejected"
            ? XCircle
            : Clock,
    }));

  return (
    <div className="space-y-6">
      <ProfileWidget
        name={user.fullName ?? "دانشجو"}
        phone={user.phone}
        role={user.role}
        roleLabel={ROLE_LABELS[user.role]}
      />

      <StatisticsGrid items={stats} loading={loading} />

      <QuickActions actions={quickActions} role={user.role} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection
          title="ثبت‌نام‌های اخیر"
          description="آخرین دوره‌های ثبت‌نام‌شده"
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-surface"
                />
              ))}
            </div>
          ) : recentEnrollments.length > 0 ? (
            <ActivityTimeline items={recentEnrollments} />
          ) : (
            <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 text-center">
              <p className="text-sm text-paragraph">هنوز ثبت‌نامی ندارید.</p>
              <Link
                to="/courses"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                مشاهده دوره‌های موجود
              </Link>
            </div>
          )}
        </DashboardSection>

        <AnnouncementsWidget />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instructor Dashboard                                                */
/* ------------------------------------------------------------------ */

function InstructorDashboard({
  user,
}: {
  user: { id: string; phone: string; fullName: string | null; role: Role };
}) {
  const [courses, setCourses] = useState<CoursePublic[]>([]);
  const [wallet, setWallet] = useState<WalletWithTransactions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [crs, wlt] = await Promise.all([getMyCourses(), getMyWallet()]);
        setCourses(crs);
        setWallet(wlt);
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
  const rejected = courses.filter((c) => c.status === "rejected").length;

  const stats: StatItem[] = [
    {
      label: "دوره‌های من",
      value: courses.length,
      icon: <BookOpen className="size-5" />,
    },
    {
      label: "منتشرشده",
      value: published,
      icon: <CheckCircle2 className="size-5" />,
    },
    {
      label: "در انتظار بررسی",
      value: pendingReview,
      icon: <Clock className="size-5" />,
    },
    { label: "رد شده", value: rejected, icon: <XCircle className="size-5" /> },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "ثبت دوره جدید",
      icon: PlusCircle,
      href: "/dashboard/create-course",
      permission: "course.create",
    },
    {
      label: "کیف‌پول من",
      icon: Wallet,
      href: "/dashboard/wallet",
      permission: "wallet.view",
      variant: "outline",
    },
    {
      label: "تیکت پشتیبانی",
      icon: Ticket,
      href: "/dashboard/tickets",
      permission: "ticket.create",
      variant: "outline",
    },
  ];

  const recentActivity: ActivityItem[] = courses.slice(0, 5).map((c) => ({
    action: "course",
    description: `دوره‌ی «${c.title}» — ${c.status === "published" ? "منتشرشده" : c.status === "pending_review" ? "در انتظار" : c.status === "rejected" ? "رد شده" : "پیش‌نویس"}`,
    time: new Date(c.createdAt).toLocaleDateString("fa-IR"),
    icon:
      c.status === "published"
        ? CheckCircle2
        : c.status === "rejected"
          ? XCircle
          : Clock,
  }));

  return (
    <div className="space-y-6">
      <ProfileWidget
        name={user.fullName ?? "مدرس"}
        phone={user.phone}
        role={user.role}
        roleLabel={ROLE_LABELS[user.role]}
      />

      <StatisticsGrid items={stats} loading={loading} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WalletWidget
          balance={wallet?.wallet?.balance ?? 0}
          loading={loading}
          href="/dashboard/wallet"
        />
      </div>

      <QuickActions actions={quickActions} role={user.role} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection
          title="دوره‌های اخیر"
          description="آخرین دوره‌های ثبت‌شده"
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-surface"
                />
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <ActivityTimeline items={recentActivity} />
          ) : (
            <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 text-center">
              <p className="text-sm text-paragraph">
                هنوز دوره‌ای ثبت نکرده‌اید.
              </p>
            </div>
          )}
        </DashboardSection>

        <AnnouncementsWidget />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Support Dashboard                                                   */
/* ------------------------------------------------------------------ */

function SupportDashboard({
  user,
}: {
  user: { id: string; phone: string; fullName: string | null; role: Role };
}) {
  const [pendingApps, setPendingApps] = useState(0);
  const [pendingCourses, setPendingCourses] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [apps, crs, pays, tix] = await Promise.all([
          listInstructorApplications({ data: { status: "pending" } }),
          listCoursesForReview({ data: { status: "pending_review" } }),
          listEnrollmentsForReview({
            data: { status: "pending_payment_review" },
          }),
          listAllTickets({ data: { status: "open" } }),
        ]);
        setPendingApps(apps.length);
        setPendingCourses(crs.length);
        setPendingPayments(pays.length);
        setOpenTickets(tix.length);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats: StatItem[] = [
    {
      label: "درخواست‌های مدرسی",
      value: pendingApps,
      icon: <GraduationCap className="size-5" />,
    },
    {
      label: "دوره‌های در انتظار",
      value: pendingCourses,
      icon: <BookOpen className="size-5" />,
    },
    {
      label: "پرداخت‌های در انتظار",
      value: pendingPayments,
      icon: <CreditCard className="size-5" />,
    },
    {
      label: "تیکت‌های باز",
      value: openTickets,
      icon: <Ticket className="size-5" />,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "بررسی درخواست‌های مدرسی",
      icon: GraduationCap,
      href: "/dashboard/support/instructor-applications",
      permission: "instructorApplication.review",
      variant: "outline",
    },
    {
      label: "بررسی دوره‌ها",
      icon: BookOpen,
      href: "/dashboard/support/courses",
      permission: "course.review",
      variant: "outline",
    },
    {
      label: "بررسی پرداخت‌ها",
      icon: CreditCard,
      href: "/dashboard/support/payments",
      permission: "enrollment.review",
      variant: "outline",
    },
    {
      label: "ثبت‌نام دستی",
      icon: UserPlus,
      href: "/dashboard/support/manual-enrollment",
      permission: "enrollment.manualCreate",
      variant: "outline",
    },
  ];

  return (
    <div className="space-y-6">
      <ProfileWidget
        name={user.fullName ?? "پشتیبان"}
        phone={user.phone}
        role={user.role}
        roleLabel={ROLE_LABELS[user.role]}
      />

      <StatisticsGrid items={stats} loading={loading} />

      <QuickActions actions={quickActions} role={user.role} />

      {/* Status cards linking to queues */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pendingApps > 0 && (
          <StatusCard
            title="درخواست مدرسی"
            count={pendingApps}
            href="/dashboard/support/instructor-applications"
            status="pending"
            label="در انتظار"
            icon={GraduationCap}
          />
        )}
        {pendingCourses > 0 && (
          <StatusCard
            title="دوره‌های جدید"
            count={pendingCourses}
            href="/dashboard/support/courses"
            status="pending"
            label="در انتظار"
            icon={BookOpen}
          />
        )}
        {pendingPayments > 0 && (
          <StatusCard
            title="پرداخت‌ها"
            count={pendingPayments}
            href="/dashboard/support/payments"
            status="pending"
            label="در انتظار"
            icon={CreditCard}
          />
        )}
        {openTickets > 0 && (
          <StatusCard
            title="تیکت‌ها"
            count={openTickets}
            href="/dashboard/support/tickets"
            status="pending"
            label="باز"
            icon={Ticket}
          />
        )}
      </div>

      <AnnouncementsWidget />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin Dashboard                                                     */
/* ------------------------------------------------------------------ */

function AdminDashboard({
  user,
}: {
  user: { id: string; phone: string; fullName: string | null; role: Role };
}) {
  const [pendingApps, setPendingApps] = useState(0);
  const [pendingCourses, setPendingCourses] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [apps, crs, pays, tix] = await Promise.all([
          listInstructorApplications({ data: { status: "pending" } }),
          listCoursesForReview({ data: { status: "pending_review" } }),
          listEnrollmentsForReview({
            data: { status: "pending_payment_review" },
          }),
          listAllTickets({ data: { status: "open" } }),
        ]);
        setPendingApps(apps.length);
        setPendingCourses(crs.length);
        setPendingPayments(pays.length);
        setOpenTickets(tix.length);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats: StatItem[] = [
    {
      label: "درخواست‌های مدرسی",
      value: pendingApps,
      icon: <GraduationCap className="size-5" />,
    },
    {
      label: "دوره‌های در انتظار",
      value: pendingCourses,
      icon: <BookOpen className="size-5" />,
    },
    {
      label: "پرداخت‌های در انتظار",
      value: pendingPayments,
      icon: <CreditCard className="size-5" />,
    },
    {
      label: "تیکت‌های باز",
      value: openTickets,
      icon: <Ticket className="size-5" />,
    },
  ];

  const systemStats: StatItem[] = [
    { label: "کاربران سیستم", value: "—", icon: <Users className="size-5" /> },
    {
      label: "دوره‌های منتشرشده",
      value: "—",
      icon: <BookOpen className="size-5" />,
    },
    {
      label: "ثبت‌نام‌های کل",
      value: "—",
      icon: <TrendingUp className="size-5" />,
    },
    { label: "درآمد کمیسیون", value: "—", icon: <Wallet className="size-5" /> },
  ];

  const quickActions: QuickAction[] = [
    {
      label: "گزارش فعالیت‌ها",
      icon: ScrollText,
      href: "/dashboard/audit-log",
      variant: "outline",
    },
    {
      label: "بررسی پرداخت‌ها",
      icon: CreditCard,
      href: "/dashboard/support/payments",
      permission: "enrollment.review",
      variant: "outline",
    },
    {
      label: "تیکت‌ها",
      icon: Ticket,
      href: "/dashboard/support/tickets",
      permission: "ticket.viewAll",
      variant: "outline",
    },
    {
      label: "ثبت‌نام دستی",
      icon: UserPlus,
      href: "/dashboard/support/manual-enrollment",
      permission: "enrollment.manualCreate",
      variant: "outline",
    },
  ];

  return (
    <div className="space-y-6">
      <ProfileWidget
        name={user.fullName ?? "مدیر"}
        phone={user.phone}
        role={user.role}
        roleLabel={ROLE_LABELS[user.role]}
      />

      {/* Pending reviews (real data) */}
      <StatisticsGrid items={stats} loading={loading} />

      {/* System overview (placeholder data) */}
      <DashboardSection
        title="نمای کلی سیستم"
        description="آمار کلی (در حال توسعه)"
      >
        <StatisticsGrid items={systemStats} loading={false} />
      </DashboardSection>

      <QuickActions actions={quickActions} role={user.role} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RealChart title="روند ثبت‌نام (۳۰ روز اخیر)" />
        <AnnouncementsWidget />
      </div>
    </div>
  );
}
