/**
 * /dashboard/settings — user settings page.
 *
 * Sections: Theme, Preferences, Sessions.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/shared/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { site } from "@/data/site";

export const Route = createFileRoute("/dashboard/_panel/settings")({
  head: () => ({ meta: [{ title: `تنظیمات | ${site.shortName}` }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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

  const themeOptions = [
    { val: "light" as const, label: "روشن", icon: Sun },
    { val: "dark" as const, label: "تاریک", icon: Moon },
    { val: "system" as const, label: "سیستم", icon: Monitor },
  ];

  return (
    <DashboardShell
      user={auth.user}
      currentSection="settings"
      title="تنظیمات"
      onLogout={handleLogout}
    >
      <div className="max-w-2xl space-y-6">
        {/* Theme */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-base font-bold text-foreground">ظاهر</h3>
          <p className="mb-3 text-sm text-paragraph">
            حالت نمایش را انتخاب کنید:
          </p>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setTheme(opt.val)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[var(--radius-md)] border p-4 transition-all",
                  theme === opt.val
                    ? "border-primary bg-primary/[0.06] text-primary"
                    : "border-border text-foreground hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800",
                )}
              >
                <opt.icon className="size-6" />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sessions */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-base font-bold text-foreground">
            نشست‌های فعال
          </h3>
          <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface/60 p-4 dark:bg-zinc-800">
            <div>
              <p className="text-sm font-medium text-foreground">این دستگاه</p>
              <p className="text-xs text-paragraph">نشست فعلی شما — فعال</p>
            </div>
            <span className="size-2.5 rounded-full bg-status-success" />
          </div>
        </div>

        {/* About */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-base font-bold text-foreground">
            درباره سیستم
          </h3>
          <p className="text-sm text-paragraph">
            مرکز کارآفرینی بین‌المللی دانشگاه شمال — نسخه ۹.۰
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
