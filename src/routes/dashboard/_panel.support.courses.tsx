/**
 * /dashboard/support/courses — course review queue for support/admin.
 *
 * Access control:
 *   - Auth: enforced by `_panel` layout (SSR-side).
 *   - Role: support/admin. Defensive check in component; real
 *     enforcement is in the server function (`requireRole`).
 *
 * UI:
 *   - Tabs at the top: «در انتظار» / «منتشرشده» / «رد شده» / «همه»
 *   - Table with columns: title, instructor, category, date, status
 *   - Click a row → Dialog opens with full details + CourseCard
 *     preview + approve/reject buttons (if status is pending_review).
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
import { CourseCard } from "@/components/cards/CourseCard";
import type { Course } from "@/types";
import { site } from "@/data/site";
import {
  listCoursesForReview,
  reviewCourse,
  type CourseWithInstructor,
  type CourseStatus,
} from "@/server/auth/courses.functions";
import type { Role } from "@/server/db/schema";

export const Route = createFileRoute("/dashboard/_panel/support/courses")({
  head: () => ({
    meta: [
      { title: `بررسی دوره‌ها | ${site.shortName}` },
      {
        name: "description",
        content: "بررسی و تایید دوره‌های آموزشی ثبت‌شده توسط مدرسان.",
      },
    ],
    links: [{ rel: "canonical", href: "/dashboard/support/courses" }],
  }),
  component: CourseReviewPage,
});

/* ------------------------------------------------------------------ */
/* Status badge mapping                                                */
/* ------------------------------------------------------------------ */

function statusBadgeProps(status: CourseStatus): {
  status: "pending" | "success" | "rejected" | "draft";
  label: string;
} {
  switch (status) {
    case "pending_review":
      return { status: "pending", label: "در انتظار بررسی" };
    case "published":
      return { status: "success", label: "منتشرشده" };
    case "rejected":
      return { status: "rejected", label: "رد شده" };
    case "draft":
      return { status: "draft", label: "پیش‌نویس" };
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type FilterTab = "pending_review" | "published" | "rejected" | "all";

function CourseReviewPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<FilterTab>("pending_review");
  const [courses, setCourses] = useState<CourseWithInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CourseWithInstructor | null>(null);
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
        const status = tab === "all" ? undefined : (tab as CourseStatus);
        const result = await listCoursesForReview({
          data: status ? { status } : {},
        });
        setCourses(result);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "بارگذاری لیست دوره‌ها با خطا مواجه شد.";
        toast.error(msg);
        setCourses([]);
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
  const openDetail = (course: CourseWithInstructor) => {
    setSelected(course);
    setDialogOpen(true);
  };

  /* -------------------- Approve / Reject -------------------- */
  const handleReview = async (
    action: "publish" | "reject",
    reviewNote?: string,
  ) => {
    if (!selected) return;

    if (action === "reject" && (!reviewNote || reviewNote.trim().length < 5)) {
      toast.error("دلیل رد باید حداقل ۵ کاراکتر باشد.");
      return;
    }

    try {
      await reviewCourse({
        data: {
          courseId: selected.id,
          action,
          reviewNote:
            action === "reject"
              ? reviewNote?.trim()
              : reviewNote?.trim() || undefined,
        },
      });

      toast.success(
        action === "publish" ? "دوره تایید و منتشر شد." : "دوره رد شد.",
      );

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
  const allowedRoles: Role[] = ["support", "admin"];
  if (!allowedRoles.includes(auth.user.role)) {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="courses-review"
        title="بررسی دوره‌ها"
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
      currentSection="courses-review"
      title="بررسی دوره‌ها"
      subtitle="بررسی و تایید دوره‌های ثبت‌شده توسط مدرسان"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="pending_review">در انتظار</TabsTrigger>
            <TabsTrigger value="published">منتشرشده</TabsTrigger>
            <TabsTrigger value="rejected">رد شده</TabsTrigger>
            <TabsTrigger value="all">همه</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
                <EmptyState
                  icon={Inbox}
                  title="دوره‌ای برای نمایش وجود ندارد"
                  description={
                    activeTab === "pending_review"
                      ? "هیچ دوره‌ی در حال انتظاری وجود ندارد."
                      : "در این دسته هیچ دوره‌ای ثبت نشده است."
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان دوره</TableHead>
                    <TableHead>مدرس</TableHead>
                    <TableHead>دسته‌بندی</TableHead>
                    <TableHead>تاریخ ثبت</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => {
                    const badge = statusBadgeProps(course.status);
                    return (
                      <TableRow
                        key={course.id}
                        onClick={() => openDetail(course)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium text-foreground">
                          {course.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {course.instructorName ?? "بدون نام"}
                            </span>
                            <span
                              dir="ltr"
                              className="text-right text-xs text-paragraph"
                            >
                              {course.instructorPhone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-paragraph">
                          {course.category}
                        </TableCell>
                        <TableCell className="text-paragraph">
                          {new Date(course.createdAt).toLocaleDateString(
                            "fa-IR",
                          )}
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

        {/* Detail Dialog */}
        <CourseDetailDialog
          course={selected}
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
/* CourseDetailDialog — full course details + preview + actions        */
/* ------------------------------------------------------------------ */

function CourseDetailDialog({
  course,
  open,
  onOpenChange,
  onReview,
}: {
  course: CourseWithInstructor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (
    action: "publish" | "reject",
    reviewNote?: string,
  ) => Promise<void>;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [publishNote, setPublishNote] = useState("");
  const [acting, setActing] = useState(false);

  // Reset state when dialog closes or course changes.
  useEffect(() => {
    if (!open) {
      setRejectMode(false);
      setRejectReason("");
      setPublishNote("");
      setActing(false);
    }
  }, [open, course]);

  if (!course) return null;

  const isPending = course.status === "pending_review";

  const handlePublish = async () => {
    setActing(true);
    try {
      await onReview("publish", publishNote.trim() || undefined);
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

  // Build a `Course` object for the CourseCard preview.
  const previewCourse: Course = {
    slug: course.slug,
    title: course.title,
    status: "current",
    cover: {
      webp: course.posterUrl ?? "/images/courses/python.webp",
      jpg: course.posterUrl ?? "/images/courses/python.jpg",
    },
    category: course.category,
    summary: course.description?.slice(0, 120),
    level:
      course.level === "beginner"
        ? "مقدماتی"
        : course.level === "intermediate"
          ? "متوسط"
          : "پیشرفته",
    startDate: course.startDate ?? undefined,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>جزئیات دوره</DialogTitle>
          <DialogDescription>
            دوره‌ی «{course.title}» — ثبت شده توسط{" "}
            <span className="font-semibold text-foreground">
              {course.instructorName ?? course.instructorPhone}
            </span>{" "}
            در {new Date(course.createdAt).toLocaleDateString("fa-IR")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-paragraph">وضعیت:</span>
            <StatusBadge {...statusBadgeProps(course.status)} />
          </div>

          {/* CourseCard preview — the actual component used on the public site */}
          <div className="rounded-[var(--radius-md)] bg-surface/50 p-4">
            <p className="mb-3 text-xs font-semibold text-paragraph">
              پیش‌نمایش کارت دوره (نمایش در صفحه‌ی عمومی پس از انتشار):
            </p>
            <div className="flex justify-center">
              <div className="w-full max-w-xs">
                <CourseCard course={previewCourse} />
              </div>
            </div>
          </div>

          {/* Course details */}
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">عنوان</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {course.title}
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">دسته‌بندی</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {course.category}
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">سطح</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {course.level === "beginner"
                  ? "مقدماتی"
                  : course.level === "intermediate"
                    ? "متوسط"
                    : "پیشرفته"}
              </dd>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">تعداد جلسات</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {course.durationSessions} جلسه
              </dd>
            </div>
            {course.capacity !== null && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <dt className="text-xs text-paragraph">ظرفیت</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {course.capacity} نفر
                </dd>
              </div>
            )}
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">قیمت</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {course.price && course.price > 0
                  ? `${course.price.toLocaleString("fa-IR")} تومان`
                  : "رایگان"}
              </dd>
            </div>
            {course.startDate && (
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <dt className="text-xs text-paragraph">تاریخ شروع</dt>
                <dd
                  dir="ltr"
                  className="mt-1 text-right text-sm font-semibold text-foreground"
                >
                  {course.startDate}
                </dd>
              </div>
            )}
          </dl>

          {/* Description */}
          <div className="rounded-[var(--radius-md)] border border-border p-3">
            <dt className="text-xs text-paragraph">توضیحات</dt>
            <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
              {course.description}
            </dd>
          </div>

          {/* Syllabus */}
          <div className="rounded-[var(--radius-md)] border border-border p-3">
            <dt className="text-xs text-paragraph">سرفصل‌ها</dt>
            <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
              {course.syllabus}
            </dd>
          </div>

          {/* Prerequisites */}
          {course.prerequisites && (
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">پیش‌نیازها</dt>
              <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">
                {course.prerequisites}
              </dd>
            </div>
          )}

          {/* Poster URL */}
          {course.posterUrl && (
            <div className="rounded-[var(--radius-md)] border border-border p-3">
              <dt className="text-xs text-paragraph">پوستر دوره</dt>
              <dd className="mt-1">
                <a
                  href={course.posterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="inline-flex items-center gap-1.5 text-right text-sm text-primary hover:underline break-all"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">{course.posterUrl}</span>
                </a>
              </dd>
            </div>
          )}

          {/* Review note (if already reviewed) */}
          {course.status === "rejected" && course.reviewNote && (
            <div className="rounded-[var(--radius-md)] border border-status-rejected/20 bg-status-rejected-bg p-3">
              <dt className="text-xs font-semibold text-status-rejected">
                دلیل رد:
              </dt>
              <dd className="mt-1 text-sm leading-6 text-foreground">
                {course.reviewNote}
              </dd>
            </div>
          )}
          {course.status === "published" && course.reviewNote && (
            <div className="rounded-[var(--radius-md)] border border-status-success/20 bg-status-success-bg p-3">
              <dt className="text-xs font-semibold text-status-success">
                یادداشت بازبین:
              </dt>
              <dd className="mt-1 text-sm leading-6 text-foreground">
                {course.reviewNote}
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
                placeholder="دلیل رد دوره را برای مدرس توضیح دهید..."
                rows={3}
                className="mt-1.5"
                autoFocus
              />
              <p className="mt-1 text-xs text-paragraph">
                حداقل ۵ کاراکتر — این متن برای مدرس قابل مشاهده خواهد بود.
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
                  تایید رد دوره
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
                  رد دوره
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handlePublish}
                  disabled={acting}
                  className="bg-status-success hover:bg-status-success/90"
                >
                  {acting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  تایید و انتشار دوره
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
