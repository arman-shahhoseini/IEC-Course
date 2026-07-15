/**
 * /dashboard/users — admin-only user management page.
 *
 * Features (per approved Phase 0 plan):
 *   - List users with pagination (20 per page)
 *   - Search by phone OR fullName (case-insensitive ILIKE)
 *   - Filter by role (student/instructor/support/admin/all)
 *   - Change user role (with audit log entry)
 *   - Activate / deactivate user (with audit log entry)
 *
 * NOT included (explicitly out of scope per Phase 0 approval):
 *   - Password reset (the project uses OTP auth, no passwords)
 *   - User creation (users self-register via OTP)
 *   - User deletion (would orphan enrollments/wallets — deferred)
 *
 * Security:
 *   - Route is admin-only — enforced UX-side here AND server-side by
 *     `requireRole(["admin"])` in every server function this page calls.
 *   - Self-deactivation + self-role-change are blocked server-side as
 *     a defense against accidental self-lockout.
 *   - Every state change writes an audit log entry.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  Users as UsersIcon,
  Search,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import { ROLE_LABELS } from "@/config/dashboard-nav";
import type { Role } from "@/server/db/schema";
import {
  listUsers,
  changeUserRole,
  setUserActive,
  type AdminUserRow,
} from "@/server/auth/admin.functions";

export const Route = createFileRoute("/dashboard/_panel/users")({
  head: () => ({
    meta: [{ title: `مدیریت کاربران | ${site.shortName}` }],
  }),
  component: UsersPage,
});

const PAGE_SIZE = 20;
const ROLE_OPTIONS: (Role | "all")[] = [
  "all",
  "student",
  "instructor",
  "support",
  "admin",
];

function UsersPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [page, setPage] = useState(0);
  // Track which user is being updated (for inline button spinner state).
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network error — navigate away regardless.
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const result = await listUsers({
        data: {
          search: search.trim() || undefined,
          roleFilter,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری.";
      toast.error(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [auth, search, roleFilter, page, toast]);

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

  // UX-only role gate — server enforces admin anyway.
  if (auth.user.role !== "admin") {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="users"
        title="مدیریت کاربران"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
          <EmptyState
            icon={ShieldAlert}
            title="دسترسی محدود"
            description="این بخش فقط برای مدیر قابل دسترس است."
          />
        </div>
      </DashboardShell>
    );
  }

  const handleRoleChange = async (user: AdminUserRow, newRole: Role) => {
    if (newRole === user.role) return;
    setUpdatingId(user.id);
    try {
      await changeUserRole({ data: { userId: user.id, newRole } });
      toast.success(`نقش کاربر به «${ROLE_LABELS[newRole]}» تغییر یافت.`);
      void load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در تغییر نقش.";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user: AdminUserRow) => {
    setUpdatingId(user.id);
    try {
      await setUserActive({
        data: { userId: user.id, isActive: !user.isActive },
      });
      toast.success(
        user.isActive ? "حساب کاربری غیرفعال شد." : "حساب کاربری فعال شد.",
      );
      void load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در تغییر وضعیت.";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell
      user={auth.user}
      currentSection="users"
      title="مدیریت کاربران"
      subtitle="مدیریت نقش‌ها و دسترسی کاربران سیستم"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="userSearch">جستجو</Label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-paragraph" />
              <Input
                id="userSearch"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="شماره موبایل یا نام..."
                className="ps-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <Label htmlFor="roleFilter">فیلتر نقش</Label>
            <Select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as Role | "all");
                setPage(0);
              }}
              className="mt-1.5"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r === "all" ? "همه نقش‌ها" : ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setRoleFilter("all");
              setPage(0);
            }}
          >
            پاک کردن فیلتر
          </Button>
        </div>

        {/* Total count */}
        <p className="text-xs text-paragraph">
          مجموع: {total.toLocaleString("fa-IR")} کاربر
        </p>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
            <EmptyState
              icon={UsersIcon}
              title="کاربری یافت نشد"
              description="هیچ کاربری با این فیلتر یافت نشد."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>موبایل</TableHead>
                  <TableHead>نقش</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>تاریخ عضویت</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      {user.fullName ?? (
                        <span className="text-paragraph">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      dir="ltr"
                      className="text-right text-xs text-paragraph"
                    >
                      {user.phone}
                    </TableCell>
                    <TableCell>
                      {user.id === auth.user.id ? (
                        // Can't change own role — show as static label.
                        <span className="text-xs font-medium text-paragraph">
                          {ROLE_LABELS[user.role]} (شما)
                        </span>
                      ) : (
                        <Select
                          value={user.role}
                          onChange={(e) =>
                            void handleRoleChange(user, e.target.value as Role)
                          }
                          disabled={updatingId === user.id}
                          size="sm"
                          className="min-w-[8rem]"
                        >
                          {(
                            [
                              "student",
                              "instructor",
                              "support",
                              "admin",
                            ] as Role[]
                          ).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={user.isActive ? "success" : "rejected"}
                        label={user.isActive ? "فعال" : "غیرفعال"}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-paragraph">
                      {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                    </TableCell>
                    <TableCell>
                      {user.id === auth.user.id ? (
                        <span className="text-xs text-paragraph">—</span>
                      ) : (
                        <Button
                          variant={user.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => void handleToggleActive(user)}
                          disabled={updatingId === user.id}
                        >
                          {user.isActive ? (
                            <>
                              <XCircle className="size-3.5" />
                              غیرفعال‌سازی
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-3.5" />
                              فعال‌سازی
                            </>
                          )}
                        </Button>
                      )}
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
                صفحه‌ی {(page + 1).toLocaleString("fa-IR")} از{" "}
                {totalPages.toLocaleString("fa-IR")}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total || loading}
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
