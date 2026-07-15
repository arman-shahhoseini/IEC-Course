/**
 * /dashboard/support/instructor-applications — review queue for support/admin.
 *
 * Access control:
 *   - Auth: enforced by `_panel` layout (SSR-side).
 *   - Role: support/admin. The page itself does a defensive check; the
 *     real enforcement is in the server function (`requireRole`).
 *
 * UI:
 *   - Tabs at the top: «در انتظار» / «تایید شده» / «رد شده» / «همه»
 *   - Table with columns: applicant, specialization, date, status
 *   - Click a row → Dialog opens with full details + approve/reject
 *     buttons (if status is pending).
 *   - Reject requires a Textarea "reason" before the button enables.
 *
 * After approve/reject: Toast + close Dialog + refresh list.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  listInstructorApplications,
  reviewInstructorApplication,
  type InstructorApplicationWithApplicant,
  type ApplicationStatus,
} from "@/server/auth/instructor-applications.functions";
import type { Role } from "@/server/db/schema";

export const Route = createFileRoute(
  "/dashboard/_panel/support/instructor-applications",
)({
  head: () => ({
    meta: [
      { title: `درخواست‌های تدریس | ${site.shortName}` },
      {
        name: "description",
        content:
          "بررسی درخواست‌های تدریس دریافتی در مرکز کارآفرینی بین‌المللی دانشگاه شمال.",
      },
    ],
    links: [
      { rel: "canonical", href: "/dashboard/support/instructor-applications" },
    ],
  }),
  component: InstructorApplicationsPage,
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type FilterTab = "pending" | "approved" | "rejected" | "all";

function InstructorApplicationsPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [applications, setApplications] = useState<
    InstructorApplicationWithApplicant[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] =
    useState<InstructorApplicationWithApplicant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* -------------------- Logout -------------------- */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* network error */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  /* -------------------- Load list -------------------- */
  const loadList = useCallback(
    async (tab: FilterTab) => {
      setLoading(true);
      try {
        const status = tab === "all" ? undefined : (tab as ApplicationStatus);
        const result = await listInstructorApplications({
          data: status ? { status } : {},
        });
        setApplications(result);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "بارگذاری لیست درخواست‌ها با خطا مواجه شد.";
        toast.error(msg);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadList(activeTab);
  }, [activeTab, loadList]);

  /* -------------------- Open detail dialog -------------------- */
  const openDetail = (app: InstructorApplicationWithApplicant) => {
    setSelected(app);
    setDialogOpen(true);
  };

  /* -------------------- Approve / Reject -------------------- */
  const handleReview = async (
    action: "approve" | "reject",
    reviewNote?: string,
  ) => {
    if (!selected) return;

    // Reject requires a reason — enforced in the server function too,
    // but we check here for immediate UX feedback.
    if (action === "reject" && (!reviewNote || reviewNote.trim().length < 5)) {
      toast.error("دلیل رد باید حداقل ۵ کاراکتر باشد.");
      return;
    }

    try {
      await reviewInstructorApplication({
        data: {
          applicationId: selected.id,
          action,
          reviewNote: action === "reject" ? reviewNote?.trim() : undefined,
        },
      });

      toast.success(
        action === "approve"
          ? "درخواست تایید شد و نقش کاربر به «مدرس» تغییر یافت."
          : "درخواست رد شد.",
      );

      // Close dialog + refresh list.
      setDialogOpen(false);
      setSelected(null);
      await loadList(activeTab);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "عملیات با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
      toast.error(msg);
    }
  };

  /* -------------------- Render -------------------- */
  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Defensive role check — real enforcement is in the server function.
  // If a non-support/admin reaches here, show a "forbidden" empty state.
  const allowedRoles: Role[] = ["support", "admin"];
  if (!allowedRoles.includes(auth.user.role)) {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="instructor-applications"
        title="درخواست‌های تدریس"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <EmptyState
            icon={Inbox}
            title="دسترسی محدود"
            description="این بخش فقط برای کاربران با نقش پشتیبان یا مدیر قابل دسترس است."
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={auth.user}
      currentSection="instructor-applications"
      title="درخواست‌های تدریس"
      subtitle="بررسی و تایید درخواست‌های تدریس دریافتی"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="pending">در انتظار</TabsTrigger>
            <TabsTrigger value="approved">تایید شده</TabsTrigger>
            <TabsTrigger value="rejected">رد شده</TabsTrigger>
            <TabsTrigger value="all">همه</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
                <EmptyState
                  icon={Inbox}
                  title="درخواستی برای نمایش وجود ندارد"
                  description={
                    activeTab === "pending"
                      ? "هیچ درخواست در حال انتظاری وجود ندارد."
                      : "در این دسته هیچ درخواستی ثبت نشده است."
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>متقاضی</TableHead>
                    <TableHead>تخصص</TableHead>
                    <TableHead>تاریخ درخواست</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow
                      key={app.id}
                      onClick={() => openDetail(app)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {app.applicantName ?? "بدون نام"}
                          </span>
                          <span
                            dir="ltr"
                            className="text-right text-xs text-paragraph"
                          >
                            {app.applicantPhone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {app.specialization}
                      </TableCell>
                      <TableCell className="text-paragraph">
                        {new Date(app.createdAt).toLocaleDateString("fa-IR")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            app.status === "pending"
                              ? "pending"
                              : app.status === "approved"
                                ? "success"
                                : "rejected"
                          }
                          label={
                            app.status === "pending"
                              ? "در انتظار"
                              : app.status === "approved"
                                ? "تایید شده"
                                : "رد شده"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <DetailDialog
          application={selected}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelected(null);
          }}
          onReview={handleReview}
        />
      </div>
    </DashboardShell>
  );
}

/* ------------------------------------------------------------------ */
/* DetailDialog — full application details + approve/reject actions    */
/* ------------------------------------------------------------------ */

function DetailDialog({
  application,
  open,
  onOpenChange,
  onReview,
}: {
  application: InstructorApplicationWithApplicant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (
    action: "approve" | "reject",
    reviewNote?: string,
  ) => Promise<void>;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  // Reset reject-mode when dialog closes or application changes.
  useEffect(() => {
    if (!open) {
      setRejectMode(false);
      setRejectReason("");
      setActing(false);
    }
  }, [open, application]);

  if (!application) return null;

  const isPending = application.status === "pending";

  const handleApprove = async () => {
    setActing(true);
    try {
      await onReview("approve");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await onReview("reject", rejectReason);
    } finally {
      setActing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>جزئیات درخواست تدریس</DialogTitle>
          <DialogDescription>
            درخواست{" "}
            <span className="font-semibold text-foreground">
              {application.applicantName ?? application.applicantPhone}
            </span>{" "}
            — ثبت شده در{" "}
            {new Date(application.createdAt).toLocaleDateString("fa-IR")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-paragraph">وضعیت:</span>
            <StatusBadge
              status={
                application.status === "pending"
                  ? "pending"
                  : application.status === "approved"
                    ? "success"
                    : "rejected"
              }
              label={
                application.status === "pending"
                  ? "در انتظار بررسی"
                  : application.status === "approved"
                    ? "تایید شده"
                    : "رد شده"
              }
            />
          </div>

          {/* Applicant info */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">نام متقاضی</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {application.applicantName ?? "—"}
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">شماره موبایل</dt>
              <dd
                dir="ltr"
                className="mt-1 text-right text-sm font-semibold text-foreground"
              >
                {application.applicantPhone}
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">حوزه‌ی تخصص</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {application.specialization}
              </dd>
            </div>
            {application.experienceYears !== null && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <dt className="text-xs text-paragraph">سابقه‌ی تدریس</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {application.experienceYears} سال
                </dd>
              </div>
            )}
          </dl>

          {/* Bio */}
          <div className="rounded-[var(--radius-md)] border border-border p-3">
            <dt className="text-xs text-paragraph">معرفی و بیوگرافی</dt>
            <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
              {application.bio}
            </dd>
          </div>

          {/* Sample work URL */}
          {application.sampleWorkUrl && (
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">نمونه‌کار</dt>
              <dd className="mt-1">
                <a
                  href={application.sampleWorkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="inline-flex items-center gap-1.5 text-right text-sm text-primary hover:underline break-all"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">{application.sampleWorkUrl}</span>
                </a>
              </dd>
            </div>
          )}

          {/* Review note (if already reviewed) */}
          {application.status === "rejected" && application.reviewNote && (
            <div className="rounded-[var(--radius-md)] border border-status-rejected/20 bg-status-rejected-bg p-3">
              <dt className="text-xs font-semibold text-status-rejected">
                دلیل رد:
              </dt>
              <dd className="mt-1 text-sm leading-6 text-foreground">
                {application.reviewNote}
              </dd>
            </div>
          )}
          {application.status === "approved" && application.reviewNote && (
            <div className="rounded-[var(--radius-md)] border border-status-success/20 bg-status-success-bg p-3">
              <dt className="text-xs font-semibold text-status-success">
                یادداشت پشتیبان:
              </dt>
              <dd className="mt-1 text-sm leading-6 text-foreground">
                {application.reviewNote}
              </dd>
            </div>
          )}

          {/* Reject reason input (only in reject mode) */}
          {isPending && rejectMode && (
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <Label htmlFor="reject-reason">
                دلیل رد <span className="text-primary">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="دلیل رد درخواست را برای متقاضی توضیح دهید..."
                rows={3}
                className="mt-1.5"
                autoFocus
              />
              <p className="mt-1 text-xs text-paragraph">
                حداقل ۵ کاراکتر — این متن برای متقاضی قابل مشاهده خواهد بود.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <DialogFooter>
            {rejectMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectReason("");
                  }}
                  disabled={acting}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleReject}
                  disabled={acting || rejectReason.trim().length < 5}
                  className="bg-status-rejected hover:bg-status-rejected/90"
                >
                  {acting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  تایید رد درخواست
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectMode(true)}
                  disabled={acting}
                  className="border-status-rejected/30 text-status-rejected hover:bg-status-rejected-bg"
                >
                  <XCircle className="size-4" />
                  رد درخواست
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleApprove}
                  disabled={acting}
                  className="bg-status-success hover:bg-status-success/90"
                >
                  {acting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  تایید درخواست
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
