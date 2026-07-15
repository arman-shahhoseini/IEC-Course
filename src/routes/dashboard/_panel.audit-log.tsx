/**
 * /dashboard/audit-log — admin-only audit log viewer.
 *
 * Shows a paginated table of all audit log entries with filter by action
 * and date range. Admin-only (not support).
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2, ScrollText } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import { listAuditLogs, type AuditLogPublic } from "@/server/audit/functions";

export const Route = createFileRoute("/dashboard/_panel/audit-log")({
  head: () => ({
    meta: [{ title: `گزارش فعالیت‌ها | ${site.shortName}` }],
  }),
  component: AuditLogPage,
});

const PAGE_SIZE = 50;

function AuditLogPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLogPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const result = await listAuditLogs({
        data: {
          action: actionFilter.trim() || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      });
      setLogs(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth, actionFilter, page, toast]);

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

  if (auth.user.role !== "admin") {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="audit-log"
        title="گزارش فعالیت‌ها"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <EmptyState
            icon={ScrollText}
            title="دسترسی محدود"
            description="این بخش فقط برای مدیر قابل دسترس است."
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={auth.user}
      currentSection="audit-log"
      title="گزارش فعالیت‌ها"
      subtitle="تاریخچه‌ی تمام عملیات‌های مهم سیستم"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        {/* Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="actionFilter">فیلتر بر اساس عملیات</Label>
            <Input
              id="actionFilter"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              placeholder="مثلاً: enrollment.confirmed"
              className="mt-1.5"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setActionFilter("");
              setPage(0);
            }}
          >
            پاک کردن فیلتر
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
            <EmptyState
              icon={ScrollText}
              title="رکوردی یافت نشد"
              description="هیچ فعالیت‌ای با این فیلتر یافت نشد."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>زمان</TableHead>
                  <TableHead>کاربر</TableHead>
                  <TableHead>عملیات</TableHead>
                  <TableHead>هدف</TableHead>
                  <TableHead>جزئیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-paragraph">
                      {new Date(log.createdAt).toLocaleString("fa-IR")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.actorId ? (
                        <span dir="ltr" className="font-mono text-paragraph">
                          {log.actorId.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-paragraph">سیستم</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-surface px-2 py-0.5 text-xs font-mono text-foreground">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-paragraph">
                      {log.targetType ?? "—"}
                      {log.targetId && (
                        <span dir="ltr" className="block font-mono">
                          {log.targetId.slice(0, 8)}...
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-paragraph">
                      {log.metadata
                        ? log.metadata.slice(0, 100) +
                          (log.metadata.length > 100 ? "..." : "")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                قبلی
              </Button>
              <span className="text-xs text-paragraph">
                صفحه‌ی {(page + 1).toLocaleString("fa-IR")}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={logs.length < PAGE_SIZE || loading}
              >
                بعدی
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
