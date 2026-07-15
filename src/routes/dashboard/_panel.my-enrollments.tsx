/**
 * /dashboard/my-enrollments — student's enrollment list.
 *
 * Shows all enrollments for the logged-in student, with status badge.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, BookOpen, Inbox } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  getMyEnrollments,
  type EnrollmentPublic,
  type EnrollmentStatus,
} from "@/server/auth/enrollments.functions";

export const Route = createFileRoute("/dashboard/_panel/my-enrollments")({
  head: () => ({
    meta: [{ title: `ثبت‌نام‌های من | ${site.shortName}` }],
  }),
  component: MyEnrollmentsPage,
});

function statusBadgeProps(status: EnrollmentStatus): {
  status: "pending" | "success" | "rejected" | "draft";
  label: string;
} {
  switch (status) {
    case "pending_payment_review":
      return { status: "pending", label: "در انتظار بررسی" };
    case "confirmed":
      return { status: "success", label: "تایید شده" };
    case "rejected":
      return { status: "rejected", label: "رد شده" };
  }
}

function MyEnrollmentsPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [enrollments, setEnrollments] = useState<EnrollmentPublic[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* network error */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const result = await getMyEnrollments();
      setEnrollments(result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "بارگذاری ثبت‌نام‌ها با خطا مواجه شد.";
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

  return (
    <DashboardShell
      user={auth.user}
      currentSection="my-enrollments"
      title="ثبت‌نام‌های من"
      subtitle="دوره‌هایی که در آن‌ها ثبت‌نام کرده‌اید"
      onLogout={handleLogout}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
          <EmptyState
            icon={BookOpen}
            title="هنوز در دوره‌ای ثبت‌نام نکرده‌اید"
            description="از صفحه‌ی دوره‌ها، دوره‌ی مورد نظر خود را انتخاب و ثبت‌نام کنید."
            action={
              <Link
                to="/courses"
                className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-semibold text-white"
              >
                مشاهده دوره‌ها
              </Link>
            }
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>دوره</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>تاریخ ثبت</TableHead>
              <TableHead>وضعیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enr) => {
              const badge = statusBadgeProps(enr.status);
              return (
                <TableRow key={enr.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link
                      to="/courses/$slug"
                      params={{ slug: enr.courseSlug }}
                      className="hover:text-primary"
                    >
                      {enr.courseTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-paragraph">
                    {enr.declaredAmount.toLocaleString("fa-IR")} تومان
                  </TableCell>
                  <TableCell className="text-paragraph">
                    {new Date(enr.createdAt).toLocaleDateString("fa-IR")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={badge.status} label={badge.label} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </DashboardShell>
  );
}
