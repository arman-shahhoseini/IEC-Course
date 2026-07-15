/**
 * /dashboard/tickets — user's support tickets.
 *
 * Any authenticated user can view their own tickets + create new ones.
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, PlusCircle, Ticket as TicketIcon, Send } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  getMyTickets,
  createTicket,
  type TicketPublic,
  type TicketStatus,
} from "@/server/auth/tickets.functions";

export const Route = createFileRoute("/dashboard/_panel/tickets")({
  head: () => ({
    meta: [{ title: `تیکت‌های من | ${site.shortName}` }],
  }),
  component: TicketsPage,
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

function TicketsPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

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
      const result = await getMyTickets();
      setTickets(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (subject.trim().length < 3) {
      toast.error("موضوع باید حداقل ۳ کاراکتر باشد.");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("پیام باید حداقل ۵ کاراکتر باشد.");
      return;
    }
    setCreating(true);
    try {
      await createTicket({
        data: { subject: subject.trim(), message: message.trim() },
      });
      toast.success("تیکت شما با موفقیت ثبت شد.");
      setShowCreate(false);
      setSubject("");
      setMessage("");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ثبت تیکت.";
      toast.error(msg);
    } finally {
      setCreating(false);
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
      currentSection="tickets"
      title="تیکت‌های من"
      subtitle="پرسش‌ها و درخواست‌های پشتیبانی شما"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-paragraph">{tickets.length} تیکت</p>
          <Button onClick={() => setShowCreate(true)}>
            <PlusCircle className="size-4" />
            تیکت جدید
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
            <EmptyState
              icon={TicketIcon}
              title="هنوز تیکتی ثبت نکرده‌اید"
              description="برای پرسش یا درخواست پشتیبانی، تیکت جدیدی ثبت کنید."
              action={
                <Button onClick={() => setShowCreate(true)}>
                  <PlusCircle className="size-4" />
                  ثبت اولین تیکت
                </Button>
              }
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
      </div>

      {/* Create ticket dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تیکت جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">موضوع</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع تیکت را بنویسید..."
                maxLength={200}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="message">پیام</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="پیام خود را بنویسید..."
                rows={5}
                maxLength={5000}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              انصراف
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              ارسال تیکت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
