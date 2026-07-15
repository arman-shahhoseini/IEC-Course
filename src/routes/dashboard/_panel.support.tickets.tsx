/**
 * /dashboard/support/tickets — support ticket queue.
 *
 * Support/admin see ALL tickets, filtered by status tab.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, Inbox } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  listAllTickets,
  type TicketPublic,
  type TicketStatus,
} from "@/server/auth/tickets.functions";
import type { Role } from "@/server/db/schema";

export const Route = createFileRoute("/dashboard/_panel/support/tickets")({
  head: () => ({
    meta: [{ title: `تیکت‌ها | ${site.shortName}` }],
  }),
  component: SupportTicketsPage,
});

function statusBadge(status: TicketStatus) {
  switch (status) {
    case "open":
      return { status: "pending" as const, label: "باز" };
    case "in_progress":
      return { status: "pending" as const, label: "در حال بررسی" };
    case "closed":
      return { status: "success" as const, label: "بسته شده" };
  }
}

type FilterTab = "open" | "in_progress" | "closed" | "all";

function SupportTicketsPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("open");
  const [tickets, setTickets] = useState<TicketPublic[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const load = useCallback(
    async (tab: FilterTab) => {
      setLoading(true);
      try {
        const status = tab === "all" ? undefined : (tab as TicketStatus);
        const result = await listAllTickets({
          data: status ? { status } : {},
        });
        setTickets(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "خطا.";
        toast.error(msg);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void load(activeTab);
  }, [activeTab, load]);

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
        currentSection="support-tickets"
        title="تیکت‌ها"
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
      currentSection="support-tickets"
      title="تیکت‌های پشتیبانی"
      subtitle="بررسی و پاسخ به تیکت‌های کاربران"
      onLogout={handleLogout}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <TabsList>
          <TabsTrigger value="open">باز</TabsTrigger>
          <TabsTrigger value="in_progress">در حال بررسی</TabsTrigger>
          <TabsTrigger value="closed">بسته شده</TabsTrigger>
          <TabsTrigger value="all">همه</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
              <EmptyState
                icon={Inbox}
                title="تیکتی وجود ندارد"
                description="در این دسته هیچ تیکتی موجود نیست."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const badge = statusBadge(t.status);
                return (
                  <Link
                    key={t.id}
                    to="/dashboard/ticket/$ticketId"
                    params={{ ticketId: t.id }}
                    className="block rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-foreground">
                          {t.subject}
                        </h3>
                        <p className="mt-1 text-xs text-paragraph">
                          {t.createdByName ?? t.createdByPhone} —{" "}
                          {new Date(t.createdAt).toLocaleDateString("fa-IR")}
                        </p>
                      </div>
                      <StatusBadge status={badge.status} label={badge.label} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
