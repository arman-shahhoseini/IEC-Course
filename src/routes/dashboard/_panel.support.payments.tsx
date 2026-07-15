/**
 * /dashboard/support/payments — payment review queue for support/admin.
 *
 * Same pattern as the instructor-applications and courses review queues:
 * Table + Tabs + Dialog with receipt image preview + confirm/reject.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2, CheckCircle2, XCircle, Inbox } from "lucide-react";
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
  listEnrollmentsForReview,
  reviewEnrollment,
  type EnrollmentWithDetails,
  type EnrollmentStatus,
} from "@/server/auth/enrollments.functions";
import type { Role } from "@/server/db/schema";

export const Route = createFileRoute("/dashboard/_panel/support/payments")({
  head: () => ({
    meta: [{ title: `بررسی پرداخت‌ها | ${site.shortName}` }],
  }),
  component: PaymentReviewPage,
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

type FilterTab = "pending_payment_review" | "confirmed" | "rejected" | "all";

function PaymentReviewPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>(
    "pending_payment_review",
  );
  const [items, setItems] = useState<EnrollmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrollmentWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* network error */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const loadList = useCallback(
    async (tab: FilterTab) => {
      setLoading(true);
      try {
        const status = tab === "all" ? undefined : (tab as EnrollmentStatus);
        const result = await listEnrollmentsForReview({
          data: status ? { status } : {},
        });
        setItems(result);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "بارگذاری لیست با خطا مواجه شد.";
        toast.error(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadList(activeTab);
  }, [activeTab, loadList]);

  const openDetail = (item: EnrollmentWithDetails) => {
    setSelected(item);
    setDialogOpen(true);
  };

  const handleReview = async (
    action: "confirm" | "reject",
    reviewNote?: string,
  ) => {
    if (!selected) return;
    if (action === "reject" && (!reviewNote || reviewNote.trim().length < 5)) {
      toast.error("دلیل رد باید حداقل ۵ کاراکتر باشد.");
      return;
    }
    try {
      const result = await reviewEnrollment({
        data: {
          enrollmentId: selected.id,
          action,
          reviewNote:
            action === "reject"
              ? reviewNote?.trim()
              : reviewNote?.trim() || undefined,
        },
      });
      toast.success(
        action === "confirm" ? "ثبت‌نام تایید شد." : "ثبت‌نام رد شد.",
      );
      if (result.warning) {
        // Legacy course — show the settlement warning.
        toast.warning(result.warning, { title: "توجه" });
      }
      setDialogOpen(false);
      setSelected(null);
      await loadList(activeTab);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "عملیات با خطا مواجه شد.";
      toast.error(msg);
    }
  };

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const allowedRoles: Role[] = ["support", "admin"];
  if (!allowedRoles.includes(auth.user.role)) {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="payments-review"
        title="بررسی پرداخت‌ها"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <EmptyState
            icon={Inbox}
            title="دسترسی محدود"
            description="این بخش فقط برای پشتیبان و مدیر قابل دسترس است."
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={auth.user}
      currentSection="payments-review"
      title="بررسی پرداخت‌ها"
      subtitle="بررسی فیش‌های واریزی و تایید ثبت‌نام"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="pending_payment_review">در انتظار</TabsTrigger>
            <TabsTrigger value="confirmed">تایید شده</TabsTrigger>
            <TabsTrigger value="rejected">رد شده</TabsTrigger>
            <TabsTrigger value="all">همه</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
                <EmptyState
                  icon={Inbox}
                  title="ثبت‌نامی برای نمایش وجود ندارد"
                  description="در این دسته هیچ ثبت‌نامی موجود نیست."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>دانشجو</TableHead>
                    <TableHead>دوره</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const badge = statusBadgeProps(item.status);
                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => openDetail(item)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {item.studentName ?? "بدون نام"}
                            </span>
                            <span
                              dir="ltr"
                              className="text-right text-xs text-paragraph"
                            >
                              {item.studentPhone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {item.courseTitle}
                        </TableCell>
                        <TableCell className="text-paragraph">
                          {item.declaredAmount.toLocaleString("fa-IR")} تومان
                        </TableCell>
                        <TableCell className="text-paragraph">
                          {new Date(item.createdAt).toLocaleDateString("fa-IR")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={badge.status}
                            label={badge.label}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>

        <PaymentDetailDialog
          item={selected}
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

function PaymentDetailDialog({
  item,
  open,
  onOpenChange,
  onReview,
}: {
  item: EnrollmentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (
    action: "confirm" | "reject",
    reviewNote?: string,
  ) => Promise<void>;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!open) {
      setRejectMode(false);
      setRejectReason("");
      setActing(false);
    }
  }, [open, item]);

  if (!item) return null;
  const isPending = item.status === "pending_payment_review";

  const handleConfirm = async () => {
    setActing(true);
    try {
      await onReview("confirm");
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

  // Warning for legacy courses without a real instructor.
  const showLegacyWarning = isPending && item.courseInstructorId === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>جزئیات ثبت‌نام</DialogTitle>
          <DialogDescription>
            ثبت‌نام در دوره‌ی «{item.courseTitle}» توسط{" "}
            <span className="font-semibold text-foreground">
              {item.studentName ?? item.studentPhone}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-paragraph">وضعیت:</span>
            <StatusBadge {...statusBadgeProps(item.status)} />
          </div>

          {/* Receipt image */}
          <div className="rounded-[var(--radius-md)] border border-border p-3">
            <p className="mb-2 text-xs font-semibold text-paragraph">
              تصویر فیش واریزی:
            </p>
            <div className="flex justify-center">
              <img
                src={item.receiptImageUrl}
                alt="فیش واریزی"
                className="max-h-64 rounded-md object-contain"
              />
            </div>
          </div>

          {/* Amount comparison */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">مبلغ اعلامی دانشجو</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {item.declaredAmount.toLocaleString("fa-IR")} تومان
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">قیمت دوره</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {item.coursePrice
                  ? `${item.coursePrice.toLocaleString("fa-IR")} تومان`
                  : "رایگان"}
              </dd>
            </div>
          </dl>

          {/* Legacy warning */}
          {showLegacyWarning && (
            <div className="rounded-[var(--radius-md)] border border-status-pending/20 bg-status-pending-bg p-3 text-sm leading-6 text-status-pending">
              <p className="font-semibold">
                توجه: این دوره مدرس ثبت‌شده در سیستم ندارد.
              </p>
              <p className="mt-1">
                این یک دوره‌ی legacy است. در صورت تایید، ثبت‌نام قطعی می‌شود اما
                تسویه با مدرس باید دستی و خارج از سیستم انجام شود.
              </p>
            </div>
          )}

          {/* Reject reason input */}
          {isPending && rejectMode && (
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <Label htmlFor="reject-reason">
                دلیل رد <span className="text-primary">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="دلیل رد ثبت‌نام را برای دانشجو توضیح دهید..."
                rows={3}
                className="mt-1.5"
                autoFocus
              />
            </div>
          )}
        </div>

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
                  تایید رد ثبت‌نام
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
                  رد ثبت‌نام
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleConfirm}
                  disabled={acting}
                  className="bg-status-success hover:bg-status-success/90"
                >
                  {acting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  تایید ثبت‌نام
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
