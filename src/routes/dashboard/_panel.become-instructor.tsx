/**
 * /dashboard/become-instructor — multi-step instructor application form.
 *
 * Access control:
 *   - Auth: enforced by the parent `_panel` layout (SSR-side).
 *   - Role: the form is shown only to `student`. If the user is already
 *     `instructor`/`support`/`admin`, or has a pending application, a
 *     status card is shown instead (with StatusBadge).
 *
 * Flow:
 *   - Step 1: specialization + experience_years
 *   - Step 2: bio (Textarea, min 50 chars)
 *   - Step 3: sample_work_url (optional) + review-and-submit
 *   - On submit: calls `submitInstructorApplication` server function.
 *     On success: Toast + show "pending" status card.
 *     On error: Toast + stay on the form (preserve entered data).
 *
 * Uses the Stepper, Input, Textarea, Select, Button, StatusBadge, Toast,
 * and EmptyState components from Stage 2.
 */
import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  getMyInstructorApplication,
  submitInstructorApplication,
  type InstructorApplicationPublic,
} from "@/server/auth/instructor-applications.functions";

export const Route = createFileRoute("/dashboard/_panel/become-instructor")({
  head: () => ({
    meta: [
      { title: `درخواست تدریس | ${site.shortName}` },
      {
        name: "description",
        content: "ثبت درخواست تدریس در مرکز کارآفرینی بین‌المللی دانشگاه شمال.",
      },
    ],
    links: [{ rel: "canonical", href: "/dashboard/become-instructor" }],
  }),
  component: BecomeInstructorPage,
});

/* ------------------------------------------------------------------ */
/* Stepper config                                                      */
/* ------------------------------------------------------------------ */

const STEPS: StepperStep[] = [
  {
    number: 1,
    label: "اطلاعات تخصص",
    description: "حوزه‌ی تدریس و سابقه",
  },
  {
    number: 2,
    label: "معرفی و بیوگرافی",
    description: "خلاصه‌ای از تجربه‌های شما",
  },
  {
    number: 3,
    label: "نمونه‌کار و ارسال",
    description: "لینک نمونه‌کار (اختیاری) و مرور نهایی",
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function BecomeInstructorPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [existingApp, setExistingApp] =
    useState<InstructorApplicationPublic | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state — persists across step navigation.
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [sampleWorkUrl, setSampleWorkUrl] = useState("");

  // Per-step errors (cleared on each navigation).
  const [stepError, setStepError] = useState<string | null>(null);

  /* -------------------- Load existing application -------------------- */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getMyInstructorApplication();
        if (!cancelled) {
          setExistingApp(result);
        }
      } catch {
        // DB unavailable or network error — show the form anyway so the
        // user can at least see something. The submit will fail with a
        // clear error message.
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------- Logout handler -------------------- */
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
  if (loadingExisting) {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="become-instructor"
        title="درخواست تدریس"
        subtitle="ثبت درخواست برای دریافت نقش مدرس"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  /* -------------------- Status card (if not eligible for form) -------------------- */
  // Eligibility for showing the form:
  //   - User is a student
  //   - AND has no pending application
  const isStudent = auth.user.role === "student";
  const hasPending = existingApp?.status === "pending";

  if (!isStudent || hasPending) {
    return (
      <StatusCard
        user={auth.user}
        existingApp={existingApp}
        onLogout={handleLogout}
      />
    );
  }

  /* -------------------- Step validation -------------------- */
  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (specialization.trim().length < 3) {
        return "حوزه‌ی تخصص باید حداقل ۳ کاراکتر باشد.";
      }
      if (specialization.length > 200) {
        return "حوزه‌ی تخصص نباید بیشتر از ۲۰۰ کاراکتر باشد.";
      }
      if (experienceYears) {
        const n = Number(experienceYears);
        if (!Number.isFinite(n) || n < 0 || n > 80) {
          return "سابقه‌ی تدریس باید عددی بین ۰ تا ۸۰ باشد.";
        }
      }
    }
    if (step === 2) {
      if (bio.trim().length < 50) {
        return "معرفی و بیوگرافی باید حداقل ۵۰ کاراکتر باشد.";
      }
      if (bio.length > 5000) {
        return "معرفی و بیوگرافی نباید بیشتر از ۵۰۰۰ کاراکتر باشد.";
      }
    }
    if (step === 3) {
      if (sampleWorkUrl.trim()) {
        try {
          const url = new URL(sampleWorkUrl.trim());
          if (url.protocol !== "https:" && url.protocol !== "http:") {
            return "لینک نمونه‌کار باید با http:// یا https:// شروع شود.";
          }
        } catch {
          return "لینک نمونه‌کار معتبر نیست.";
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
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const goBack = () => {
    setStepError(null);
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const error = validateStep(3);
    if (error) {
      setStepError(error);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitInstructorApplication({
        data: {
          specialization: specialization.trim(),
          bio: bio.trim(),
          experienceYears: experienceYears ? Number(experienceYears) : null,
          sampleWorkUrl: sampleWorkUrl.trim() || null,
        },
      });
      setExistingApp(result);
      toast.success("درخواست شما با موفقیت ثبت شد و در حال بررسی است.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "ثبت درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- Render -------------------- */
  return (
    <DashboardShell
      user={auth.user}
      currentSection="become-instructor"
      title="درخواست تدریس"
      subtitle="ثبت درخواست برای دریافت نقش مدرس"
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
                  اطلاعات تخصص
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  حوزه‌ی تدریس و سابقه‌ی شما را وارد کنید.
                </p>
              </div>

              <div>
                <Label htmlFor="specialization">
                  حوزه‌ی تخصص <span className="text-primary">*</span>
                </Label>
                <Input
                  id="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="مثلاً: برنامه‌نویسی پایتون، حسابداری، مدیریت کسب‌وکار"
                  maxLength={200}
                  required
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  {specialization.length}/۲۰۰ کاراکتر
                </p>
              </div>

              <div>
                <Label htmlFor="experienceYears">سابقه‌ی تدریس (سال)</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  min={0}
                  max={80}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="مثلاً: ۵"
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  اختیاری — تعداد سال‌های تجربه‌ی تدریس در این حوزه.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  معرفی و بیوگرافی
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  خلاصه‌ای از تجربه‌ها، مهارت‌ها و دلیل تمایل شما به تدریس.
                </p>
              </div>

              <div>
                <Label htmlFor="bio">
                  معرفی و بیوگرافی <span className="text-primary">*</span>
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="خودتان را معرفی کنید: تجربه‌های حرفه‌ای، دوره‌هایی که می‌توانید تدریس کنید، و چرا می‌خواهید مدرس IEC شوید..."
                  rows={8}
                  maxLength={5000}
                  required
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  {bio.length}/۵۰۰۰ کاراکتر — حداقل ۵۰ کاراکتر الزامی است.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  نمونه‌کار و مرور نهایی
                </h2>
                <p className="mt-1 text-sm text-paragraph">
                  لینک نمونه‌کار اختیاری است، اما برای بررسی بهتر درخواست شما
                  توصیه می‌شود.
                </p>
              </div>

              <div>
                <Label htmlFor="sampleWorkUrl">لینک نمونه‌کار / رزومه</Label>
                <Input
                  id="sampleWorkUrl"
                  type="url"
                  dir="ltr"
                  value={sampleWorkUrl}
                  onChange={(e) => setSampleWorkUrl(e.target.value)}
                  placeholder="https://example.com/your-portfolio"
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-paragraph">
                  اختیاری — لینک به نمونه‌کار، رزومه، یا دوره‌های قبلی شما.
                </p>
              </div>

              {/* Review summary */}
              <div className="rounded-[var(--radius-md)] border border-border bg-surface/40 p-4">
                <h3 className="text-sm font-bold text-foreground">
                  مرور نهایی
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">تخصص:</dt>
                    <dd className="text-foreground">{specialization || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">سابقه:</dt>
                    <dd className="text-foreground">
                      {experienceYears ? `${experienceYears} سال` : "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">نمونه‌کار:</dt>
                    <dd
                      dir="ltr"
                      className="truncate text-right text-foreground"
                    >
                      {sampleWorkUrl || "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-paragraph">بیوگرافی:</dt>
                    <dd className="line-clamp-3 flex-1 text-foreground">
                      {bio || "—"}
                    </dd>
                  </div>
                </dl>
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

            {currentStep < 3 ? (
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
                ارسال درخواست
              </Button>
            )}
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

/* ------------------------------------------------------------------ */
/* StatusCard — shown when user can't submit (already instructor / pending) */
/* ------------------------------------------------------------------ */

function StatusCard({
  user,
  existingApp,
  onLogout,
}: {
  user: {
    id: string;
    phone: string;
    fullName: string | null;
    role: "student" | "instructor" | "support" | "admin";
    isActive: boolean;
  };
  existingApp: InstructorApplicationPublic | null;
  onLogout: () => void;
}) {
  // If the user is already an instructor, they don't need to apply.
  if (
    user.role === "instructor" ||
    user.role === "support" ||
    user.role === "admin"
  ) {
    return (
      <DashboardShell
        user={user}
        currentSection="become-instructor"
        title="درخواست تدریس"
        onLogout={onLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 shadow-card">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-16 place-items-center rounded-full bg-status-success-bg">
              <GraduationCap className="size-8 text-status-success" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">
              شما مدرس هستید
            </h2>
            <p className="mt-2 max-w-md text-sm text-paragraph">
              نقش کاربری شما «
              {user.role === "instructor"
                ? "مدرس"
                : user.role === "support"
                  ? "پشتیبان"
                  : "مدیر"}
              » است و نیازی به ثبت درخواست تدریس ندارید.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // User has a pending application.
  if (existingApp?.status === "pending") {
    return (
      <DashboardShell
        user={user}
        currentSection="become-instructor"
        title="درخواست تدریس"
        onLogout={onLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 shadow-card">
          <div className="flex flex-col items-start gap-4">
            <div className="flex w-full items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-foreground">
                وضعیت درخواست شما
              </h2>
              <StatusBadge status="pending" label="در انتظار بررسی" />
            </div>
            <p className="text-sm leading-6 text-paragraph">
              درخواست شما برای تدریس در تاریخ{" "}
              <span className="font-semibold text-foreground">
                {new Date(existingApp.createdAt).toLocaleDateString("fa-IR")}
              </span>{" "}
              ثبت شده و در حال بررسی توسط تیم پشتیبانی است. پس از تصمیم‌گیری،
              نتیجه از طریق همین صفحه به اطلاع شما خواهد رسید.
            </p>

            <dl className="grid w-full gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-border p-3">
                <dt className="text-xs text-paragraph">حوزه‌ی تخصص</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {existingApp.specialization}
                </dd>
              </div>
              {existingApp.experienceYears !== null && (
                <div className="rounded-[var(--radius-md)] border border-border p-3">
                  <dt className="text-xs text-paragraph">سابقه‌ی تدریس</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {existingApp.experienceYears} سال
                  </dd>
                </div>
              )}
            </dl>

            {existingApp.sampleWorkUrl && (
              <a
                href={existingApp.sampleWorkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                dir="ltr"
              >
                <ExternalLink className="size-3.5" />
                {existingApp.sampleWorkUrl}
              </a>
            )}
          </div>
        </div>
      </DashboardShell>
    );
  }

  // User has a rejected application — they can resubmit, but we show the
  // rejection reason first. The "resubmit" button reveals the form.
  // For simplicity in Stage 3, we just show the rejection and a button
  // that reloads the page to clear `existingApp` state. A proper
  // "resubmit" flow would clear `existingApp` in-place; left for later.
  if (existingApp?.status === "rejected") {
    return (
      <DashboardShell
        user={user}
        currentSection="become-instructor"
        title="درخواست تدریس"
        onLogout={onLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 shadow-card">
          <div className="flex flex-col items-start gap-4">
            <div className="flex w-full items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-foreground">
                درخواست قبلی شما رد شده است
              </h2>
              <StatusBadge status="rejected" label="رد شده" />
            </div>
            <p className="text-sm leading-6 text-paragraph">
              درخواست شما در تاریخ{" "}
              <span className="font-semibold text-foreground">
                {new Date(
                  existingApp.reviewedAt ?? existingApp.createdAt,
                ).toLocaleDateString("fa-IR")}
              </span>{" "}
              توسط تیم پشتیبانی بررسی و رد شد.
            </p>
            {existingApp.reviewNote && (
              <div className="w-full rounded-[var(--radius-md)] border border-status-rejected/20 bg-status-rejected-bg p-4">
                <p className="text-xs font-semibold text-status-rejected">
                  دلیل رد:
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {existingApp.reviewNote}
                </p>
              </div>
            )}
            <Button
              type="button"
              onClick={() => window.location.reload()}
              variant="default"
            >
              ثبت درخواست جدید
            </Button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Fallback — no existing app, eligible to apply. This shouldn't be
  // reached because the parent component handles this case, but we
  // include it for safety.
  return null;
}
