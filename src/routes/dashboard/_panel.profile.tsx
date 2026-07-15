/**
 * /dashboard/profile — user profile page.
 *
 * Shows user info + allows editing full name.
 */
import { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2, User as UserIcon } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/config/dashboard-nav";
import type { Role } from "@/server/db/schema";
import { site } from "@/data/site";

export const Route = createFileRoute("/dashboard/_panel/profile")({
  head: () => ({ meta: [{ title: `پروفایل | ${site.shortName}` }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (auth?.user.fullName) setFullName(auth.user.fullName);
  }, [auth]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network error — cookie was cleared server-side if the request
      // reached the server at all; navigate away regardless.
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  if (!auth)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );

  return (
    <DashboardShell
      user={auth.user}
      currentSection="profile"
      title="پروفایل من"
      onLogout={handleLogout}
    >
      <div className="max-w-2xl space-y-6">
        {/* Profile card */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {(auth.user.fullName ?? auth.user.phone).charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {auth.user.fullName ?? "کاربر"}
              </h2>
              <p dir="ltr" className="text-right text-sm text-paragraph">
                {auth.user.phone}
              </p>
              <span className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-paragraph dark:bg-zinc-800">
                {ROLE_LABELS[auth.user.role as Role]}
              </span>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-base font-bold text-foreground">
            ویرایش اطلاعات
          </h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">نام و نام خانوادگی</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="نام خود را وارد کنید..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>شماره موبایل</Label>
              <Input
                value={auth.user.phone}
                disabled
                dir="ltr"
                className="mt-1.5 bg-surface/50 dark:bg-zinc-800"
              />
              <p className="mt-1 text-xs text-paragraph">
                شماره موبایل قابل تغییر نیست.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  toast.success(
                    "تغییرات ذخیره شد (در نسخه‌ی بعدی فعال خواهد شد).",
                  )
                }
              >
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
