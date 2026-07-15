/**
 * /dashboard/create-course — multi-step course creation wizard.
 *
 * Access control:
 *   - Auth: enforced by the parent `_panel` layout (SSR-side).
 *   - Role: instructor/admin. If a student reaches here (e.g. direct
 *     URL), show a guidance message + link to /dashboard/become-instructor.
 *
 * Flow:
 *   - Step 1: اطلاعات پایه (title, category, level, duration_sessions)
 *   - Step 2: محتوا (description, syllabus, prerequisites)
 *   - Step 3: برنامه و ظرفیت (start_date, capacity, price, poster_url)
 *   - Step 4: پیش‌نمایش نهایی — renders the actual `CourseCard`
 *     component with the entered data, so the instructor sees exactly
 *     how the course will look on the public site (once published and
 *     integrated). Then a "submit for review" button.
 *   - On submit: calls `createCourse` server function. On success:
 *     Toast + redirect to /dashboard/my-courses. On error: Toast +
 *     stay on the form (preserve entered data).
 *
 * Uses Stepper, Input, Textarea, Select, Label, Button, Toast, and
 * the existing CourseCard component (read-only import).
 */
import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { CourseCard } from "@/components/cards/CourseCard";
import type { Course } from "@/types";
import { site } from "@/data/site";
import {
  createCourse,
  type CourseLevel,
} from "@/server/auth/courses.functions";

export const Route = createFileRoute("/dashboard/_panel/create-course")({
  head: () => ({
    meta: [
      { title: `ثبت دوره جدید | ${site.shortName}` },
      {
        name: "description",
        content: "ثبت دوره آموزشی جدید برای بررسی و انتشار.",
      },
    ],
    links: [{ rel: "canonical", href: "/dashboard/create-course" }],
  }),
  component: CreateCoursePage,
});

/* ------------------------------------------------------------------ */
/* Stepper config                                                      */
/* ------------------------------------------------------------------ */

const STEPS: StepperStep[] = [
  {
    number: 1,
    label: "اطلاعات پایه",
    description: "عنوان، دسته‌بندی، سطح و جلسات",
  },
  {
    number: 2,
    label: "محتوای دوره",
    description: "توضیحات، سرفصل‌ها و پیش‌نیازها",
  },
  {
    number: 3,
    label: "برنامه و ظرفیت",
    description: "تاریخ شروع، ظرفیت، قیمت و پوستر",
  },
  {
    number: 4,
    label: "پیش‌نمایش و ارسال",
    description: "مرور نهایی و ارسال برای بررسی",
  },
];

/* ------------------------------------------------------------------ */
/* Level options                                                       */
/* ------------------------------------------------------------------ */

const LEVEL_OPTIONS: { value: CourseLevel; label: string }[] = [
  { value: "beginner", label: "مقدماتی" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "پیشرفته" },
];

/** Map internal level enum to the Persian label used by the static `Level` type. */
const LEVEL_LABELS_PERSIAN: Record<
  CourseLevel,
  "مقدماتی" | "متوسط" | "پیشرفته"
> = {
  beginner: "مقدماتی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function CreateCoursePage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state — persists across step navigation.
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<CourseLevel>("beginner");
  const [durationSessions, setDurationSessions] = useState("");
  const [description, setDescription] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [startDate, setStartDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

  // Per-step errors (cleared on each navigation).
  const [stepError, setStepError] = useState<string | null>(null);

  /* -------------------- Logout -------------------- */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* network error — still navigate */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  /* -------------------- Loading state -------------------- */
  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  /* -------------------- Role guard -------------------- */
  // Only instructors/admins can create courses. Students get a guidance
  // message. The real enforcement is in the server function.
  if (auth.user.role !== "instructor" && auth.user.role !== "admin") {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="new-course"
        title="ثبت دوره جدید"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 shadow-card">
          <EmptyState
            icon={GraduationCap}
            title="برای ثبت دوره باید مدرس باشید"
            description="فقط کاربرانی که نقش «مدرس» دارند می‌توانند دوره ثبت کنند. اگر درخواست تدریس داده‌اید، پس از تایید پشتیبان می‌توانید دوره بسازید."
            action={
              <Button asChild variant="default">
                <Link to="/dashboard/become-instructor">ثبت درخواست تدریس</Link>
              </Button>
            }
          />
        </div>
      </DashboardShell>
    );
  }

  /* -------------------- Step validation -------------------- */
  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (title.trim().length < 3) {
        return "عنوان دوره باید حداقل ۳ کاراکتر باشد.";
      }
      if (title.length > 200) {
        return "عنوان دوره نباید بیشتر از ۲۰۰ کاراکتر باشد.";
      }
      if (category.trim().length < 2) {
        return "حوزه/دسته‌بندی باید حداقل ۲ کاراکتر باشد.";
      }
      const ds = Number(durationSessions);
      if (!durationSessions || !Number.isFinite(ds) || ds < 1 || ds > 200) {
        return "تعداد جلسات باید عددی بین ۱ تا ۲۰۰ باشد.";
      }
    }
    if (step === 2) {
      if (description.trim().length < 20) {
        return "توضیحات دوره باید حداقل ۲۰ کاراکتر باشد.";
      }
      if (syllabus.trim().length < 20) {
        return "سرفصل‌ها باید حداقل ۲۰ کاراکتر باشد.";
      }
      if (prerequisites.length > 2000) {
        return "پیش‌نیازها نباید بیشتر از ۲۰۰۰ کاراکتر باشد.";
      }
    }
    if (step === 3) {
      if (capacity) {
        const c = Number(capacity);
        if (!Number.isFinite(c) || c < 1 || c > 10000) {
          return "ظرفیت باید عددی بین ۱ تا ۱۰۰۰۰ باشد.";
        }
      }
      if (price) {
        const p = Number(price);
        if (!Number.isFinite(p) || p < 0 || p > 1_000_000_000) {
          return "قیمت باید عددی بین ۰ تا ۱٬۰۰۰٬۰۰۰٬۰۰۰ تومان باشد.";
        }
      }
      if (posterUrl.trim()) {
        try {
          const url = new URL(posterUrl.trim());
          if (url.protocol !== "https:" && url.protocol !== "http:") {
            return "لینک پوستر باید با http:// یا https:// شروع شود.";
          }
        } catch {
          return "لینک پوستر معتبر نیست.";
        }
      }
      if (startDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          return "تاریخ شروع باید با فرمت yyyy-mm-dd باشد.";
        }
      }
    }
    return null;
  };

  /* -------------------- Navigation -------------------- */
  const goNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    setStepError(null);
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Validate all steps one more time before submit.
    for (let s = 1; s <= 3; s++) {
      const error = validateStep(s);
      if (error) {
        setCurrentStep(s);
        setStepError(error);
        toast.error("لطفاً خطاهای فرم را برطرف کنید.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await createCourse({
        data: {
          title: title.trim(),
          category: category.trim(),
          level,
          durationSessions: Number(durationSessions),
          description: description.trim(),
          syllabus: syllabus.trim(),
          prerequisites: prerequisites.trim() || null,
          capacity: capacity ? Number(capacity) : null,
          price: price ? Number(price) : null,
          posterUrl: posterUrl.trim() || null,
          startDate: startDate || null,
        },
      });
      toast.success("دوره با موفقیت ثبت شد و در انتظار بررسی است.");
      router.invalidate();
      void router.navigate({
        to: "/dashboard/$section",
        params: { section: "my-courses" },
        search: {},
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "ثبت دوره با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- Build preview Course object -------------------- */
  // Map the form state to the static `Course` type so we can reuse the
  // existing `CourseCard` component for the preview. The card expects
  // a `cover` with webp+jpg URLs — we use the entered posterUrl for
  // both (if provided), or a fallback placeholder.
  const previewCourse: Course = {
    slug: "preview",
    title: title.trim() || "عنوان دوره",
    status: "current",
    cover: {
      webp: posterUrl.trim() || "/images/courses/python.webp",
      jpg: posterUrl.trim() || "/images/courses/python.jpg",
    },
    category: category.trim() || undefined,
    summary: description.trim().slice(0, 120) || undefined,
    level: LEVEL_LABELS_PERSIAN[level],
    startDate: startDate || undefined,
  };

  /* -------------------- Render -------------------- */
  return (
    <DashboardShell
      user={auth.user}
      currentSection="new-course"
      title="ثبت دوره جدید"
      subtitle="تکمیل فرم چندمرحله‌ای برای ثبت دوره"
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Stepper header */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <Stepper steps={STEPS} current={currentStep} />
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8"
        >
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  اطلاعات پایه
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  عنوان، دسته‌بندی، سطح و تعداد جلسات دوره را وارد کنید.
                </p>
              </div>

              <div>
                <Label htmlFor="title">
                  عنوان دوره <span className="text-primary">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: برنامه‌نویسی پایتون از صفر تا صد"
                  maxLength={200}
                  required
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  {title.length}/۲۰۰ کاراکتر
                </p>
              </div>

              <div>
                <Label htmlFor="category">
                  حوزه/دسته‌بندی <span className="text-primary">*</span>
                </Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="مثلاً: برنامه‌نویسی، حسابداری، مدیریت"
                  maxLength={200}
                  required
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="level">
                    سطح دوره <span className="text-primary">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <select
                      id="level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value as CourseLevel)}
                      className="flex h-11 w-full appearance-none rounded-[var(--radius-md)] border border-border bg-white px-3.5 pe-10 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      aria-hidden="true"
                      className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-paragraph"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>

                <div>
                  <Label htmlFor="durationSessions">
                    تعداد جلسات <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="durationSessions"
                    type="number"
                    min={1}
                    max={200}
                    value={durationSessions}
                    onChange={(e) => setDurationSessions(e.target.value)}
                    placeholder="مثلاً: ۱۲"
                    required
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  محتوای دوره
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  توضیحات کامل، سرفصل‌ها و پیش‌نیازهای دوره.
                </p>
              </div>

              <div>
                <Label htmlFor="description">
                  توضیحات دوره <span className="text-primary">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات کامل دوره، اهداف، مخاطب هدف و خروجی‌های دوره را بنویسید..."
                  rows={5}
                  maxLength={5000}
                  required
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  {description.length}/۵۰۰۰ کاراکتر — حداقل ۲۰ کاراکتر الزامی
                  است.
                </p>
              </div>

              <div>
                <Label htmlFor="syllabus">
                  سرفصل‌ها <span className="text-primary">*</span>
                </Label>
                <Textarea
                  id="syllabus"
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  placeholder={
                    "سرفصل‌های دوره را به‌صورت خط‌به‌خط وارد کنید.\nمثلاً:\n- جلسه ۱: مقدمات\n- جلسه ۲: متغیرها و انواع داده\n- ..."
                  }
                  rows={8}
                  maxLength={10000}
                  required
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  {syllabus.length}/۱۰۰۰۰ کاراکتر — حداقل ۲۰ کاراکتر الزامی است.
                </p>
              </div>

              <div>
                <Label htmlFor="prerequisites">پیش‌نیازها</Label>
                <Textarea
                  id="prerequisites"
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  placeholder="دانش‌پیش‌نیازها، مهارت‌های لازم یا دوره‌هایی که باید قبلاً گذرانده باشد (اختیاری)..."
                  rows={3}
                  maxLength={2000}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  اختیاری — حداکثر ۲۰۰۰ کاراکتر.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  برنامه و ظرفیت
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  تاریخ شروع، ظرفیت، قیمت و پوستر دوره.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">تاریخ شروع</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-paragraph">
                    اختیاری — فرمت: yyyy-mm-dd
                  </p>
                </div>

                <div>
                  <Label htmlFor="capacity">ظرفیت (نفر)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    max={10000}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="خالی = نامحدود"
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-paragraph">
                    اختیاری — خالی بگذارید برای ظرفیت نامحدود.
                  </p>
                </div>

                <div>
                  <Label htmlFor="price">قیمت (تومان)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    max={1000000000}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="خالی یا ۰ = رایگان"
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-paragraph">
                    اختیاری — به تومان. خالی یا ۰ برای دوره‌ی رایگان.
                  </p>
                </div>

                <div>
                  <Label htmlFor="posterUrl">لینک پوستر دوره</Label>
                  <Input
                    id="posterUrl"
                    type="url"
                    dir="ltr"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://example.com/poster.jpg"
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-paragraph">
                    اختیاری — لینک مستقیم به تصویر پوستر.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  پیش‌نمایش و ارسال
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  دوره‌ی شما دقیقاً به این شکل در سایت نمایش داده خواهد شد.
                  لطفاً همه‌ی اطلاعات را بررسی کنید و سپس برای تایید ارسال کنید.
                </p>
              </div>

              {/* Preview using the real CourseCard component */}
              <div className="flex justify-center rounded-[var(--radius-md)] bg-surface/50 p-6">
                <div className="w-full max-w-xs">
                  <CourseCard course={previewCourse} />
                </div>
              </div>

              {/* Summary of all entered data */}
              <div className="rounded-[var(--radius-md)] border border-border bg-surface/40 p-4">
                <h3 className="text-sm font-bold text-foreground">
                  خلاصه‌ی اطلاعات
                </h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">عنوان:</dt>
                    <dd className="text-foreground">{title || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">دسته‌بندی:</dt>
                    <dd className="text-foreground">{category || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">سطح:</dt>
                    <dd className="text-foreground">
                      {LEVEL_LABELS_PERSIAN[level]}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">جلسات:</dt>
                    <dd className="text-foreground">
                      {durationSessions || "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">ظرفیت:</dt>
                    <dd className="text-foreground">{capacity || "نامحدود"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">قیمت:</dt>
                    <dd className="text-foreground">
                      {price
                        ? `${Number(price).toLocaleString("fa-IR")} تومان`
                        : "رایگان"}
                    </dd>
                  </div>
                  {startDate && (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-paragraph">شروع:</dt>
                      <dd dir="ltr" className="text-right text-foreground">
                        {startDate}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-status-pending-bg p-3 text-xs leading-5 text-status-pending">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>
                  پس از ارسال، دوره در وضعیت «در انتظار بررسی» قرار می‌گیرد و
                  توسط تیم پشتیبانی بررسی می‌شود. تا تایید نهایی، دوره در صفحه‌ی
                  عمومی نمایش داده نمی‌شود.
                </p>
              </div>
            </div>
          )}

          {/* Step error */}
          {stepError && (
            <p
              role="alert"
              className="mt-5 rounded-[var(--radius-sm)] bg-primary/5 px-3 py-2 text-sm text-primary"
            >
              {stepError}
            </p>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 1 || submitting}
            >
              <ArrowRight className="size-4" />
              مرحله‌ی قبل
            </Button>

            {currentStep < 4 ? (
              <Button type="button" onClick={goNext} disabled={submitting}>
                مرحله‌ی بعد
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                ارسال برای بررسی
              </Button>
            )}
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
