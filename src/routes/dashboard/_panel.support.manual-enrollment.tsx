/**
 * /dashboard/support/manual-enrollment — manual enrollment by support/admin.
 *
 * For students who paid in-person/phone and didn't go through the online
 * payment flow. Support enters their phone + course + amount, and the
 * enrollment is created as confirmed + wallet credited in one atomic
 * transaction.
 */
import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import { createManualEnrollment } from "@/server/auth/manual-enrollment.functions";
import { getPublicCourses } from "@/server/auth/public-courses.functions";

export const Route = createFileRoute(
  "/dashboard/_panel/support/manual-enrollment",
)({
  head: () => ({
    meta: [{ title: `ثبت‌نام دستی | ${site.shortName}` }],
  }),
  component: ManualEnrollmentPage,
});

function ManualEnrollmentPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  // Load published courses for the select.
  const [allCourses, setAllCourses] = useState<
    { id: string; title: string; price: number | null; slug: string }[]
  >([]);
  useState(() => {
    void (async () => {
      try {
        const data = await getPublicCourses();
        const flat = [...data.current, ...data.upcoming, ...data.archived].map(
          (c) => ({
            id: (c as { id?: string }).id ?? "",
            title: c.title,
            price: null as number | null,
            slug: c.slug,
          }),
        );
        setAllCourses(flat.filter((c) => c.id));
      } catch {
        /* ignore */
      }
    })();
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("شماره موبایل الزامی است.");
      return;
    }
    if (!courseId) {
      toast.error("انتخاب دوره الزامی است.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("مبلغ باید عددی غیرمنفی باشد.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createManualEnrollment({
        data: {
          phone: phone.trim(),
          courseId,
          amount: amt,
          note: note.trim() || undefined,
        },
      });
      toast.success("ثبت‌نام دستی با موفقیت انجام شد.");
      if (result.warning) {
        toast.warning(result.warning, { title: "توجه" });
      }
      setPhone("");
      setCourseId("");
      setAmount("");
      setNote("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ثبت‌نام دستی.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
      currentSection="manual-enrollment"
      title="ثبت‌نام دستی"
      subtitle="ثبت‌نام مستقیم کاربر با تایید دستی پرداخت"
      onLogout={handleLogout}
    >
      <div className="max-w-2xl">
        <div className="mb-6 rounded-[var(--radius-md)] border border-status-pending/20 bg-status-pending-bg p-4 text-sm leading-6 text-status-pending">
          <p>
            این فرم برای ثبت‌نام کاربرانی است که حضوری یا تلفنی پرداخت کرده‌اند.
            ثبت‌نام مستقیماً به‌صورت تاییدشده ثبت می‌شود و کیف‌پول مدرس بلافاصله
            شارژ می‌گردد.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8"
        >
          <div>
            <Label htmlFor="phone">
              شماره موبایل دانشجو <span className="text-primary">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              required
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-paragraph">
              اگر کاربری با این شماره وجود نداشته باشد، به‌صورت خودکار ساخته
              می‌شود.
            </p>
          </div>

          <div>
            <Label htmlFor="course">
              دوره <span className="text-primary">*</span>
            </Label>
            <div className="relative mt-1.5">
              <select
                id="course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="flex h-11 w-full appearance-none rounded-[var(--radius-md)] border border-border bg-white px-3.5 pe-10 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">انتخاب دوره...</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="amount">
              مبلغ تاییدشده (تومان) <span className="text-primary">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min={0}
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مبلغ واریز شده"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="note">یادداشت (اختیاری)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="توضیحات اضافی (مثلاً: پرداخت حضوری، نقدی...)"
              rows={2}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              ثبت‌نام و تایید
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
