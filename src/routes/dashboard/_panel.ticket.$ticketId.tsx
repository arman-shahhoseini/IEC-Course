/**
 * /dashboard/ticket/$ticketId — ticket conversation view.
 *
 * Shows the full message thread + a reply form (if ticket is not closed).
 * Accessible to: ticket creator + support/admin.
 */
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  getTicketDetail,
  replyToTicket,
  closeTicket,
  type TicketDetail,
  type TicketStatus,
} from "@/server/auth/tickets.functions";
import { ROLE_LABELS } from "@/config/dashboard-nav";

export const Route = createFileRoute("/dashboard/_panel/ticket/$ticketId")({
  head: () => ({
    meta: [{ title: `تیکت | ${site.shortName}` }],
  }),
  component: TicketDetailPage,
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

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

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
      const result = await getTicketDetail({ data: { ticketId } });
      setDetail(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بارگذاری.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth, ticketId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (reply.trim().length < 1) return;
    setSending(true);
    try {
      await replyToTicket({ data: { ticketId, body: reply.trim() } });
      setReply("");
      toast.success("پیام شما ارسال شد.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ارسال.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeTicket({ data: { ticketId } });
      toast.success("تیکت بسته شد.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در بستن تیکت.";
      toast.error(msg);
    } finally {
      setClosing(false);
    }
  };

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="tickets"
        title="تیکت"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell
        user={auth.user}
        currentSection="tickets"
        title="تیکت"
        onLogout={handleLogout}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-8 shadow-card text-center">
          <p className="text-sm text-paragraph">
            تیکت یافت نشد یا دسترسی ندارید.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link
              to="/dashboard/$section"
              params={{ section: "tickets" }}
              search={{} as never}
            >
              بازگشت به تیکت‌ها
            </Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const isStaff = auth.user.role === "support" || auth.user.role === "admin";
  const isClosed = detail.ticket.status === "closed";
  const badge = statusBadge(detail.ticket.status);

  return (
    <DashboardShell
      user={auth.user}
      currentSection="tickets"
      title={detail.ticket.subject}
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground">
              {detail.ticket.subject}
            </h2>
            <p className="mt-1 text-xs text-paragraph">
              توسط {detail.ticket.createdByName ?? detail.ticket.createdByPhone}{" "}
              — {new Date(detail.ticket.createdAt).toLocaleDateString("fa-IR")}
            </p>
          </div>
          <StatusBadge status={badge.status} label={badge.label} />
        </div>

        {/* Messages */}
        <div className="space-y-3">
          {detail.messages.map((msg) => {
            const isOwn = msg.senderId === auth.user.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-[var(--radius-md)] border p-4 ${
                    isOwn
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-paragraph">
                    <span className="font-semibold text-foreground">
                      {msg.senderName ?? "کاربر"}
                    </span>
                    <span>—</span>
                    <span>
                      {ROLE_LABELS[
                        msg.senderRole as keyof typeof ROLE_LABELS
                      ] ?? msg.senderRole}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {msg.body}
                  </p>
                  <p className="mt-2 text-xs text-paragraph">
                    {new Date(msg.createdAt).toLocaleString("fa-IR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply form */}
        {!isClosed && (
          <form
            onSubmit={handleReply}
            className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card"
          >
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="پاسخ خود را بنویسید..."
              rows={3}
              className="mb-3"
            />
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={closing || sending}
              >
                {closing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                بستن تیکت
              </Button>
              <Button
                type="submit"
                disabled={sending || reply.trim().length < 1}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                ارسال پاسخ
              </Button>
            </div>
          </form>
        )}

        {isClosed && (
          <div className="rounded-[var(--radius-md)] border border-border bg-surface/50 p-4 text-center text-sm text-paragraph">
            این تیکت بسته شده است.
          </div>
        )}

        {/* Support-only: assign button */}
        {isStaff && !isClosed && detail.ticket.assignedTo !== auth.user.id && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { assignTicket } =
                    await import("@/server/auth/tickets.functions");
                  await assignTicket({ data: { ticketId } });
                  toast.success("تیکت به شما تخصیص داده شد.");
                  await load();
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "خطا.";
                  toast.error(msg);
                }
              }}
            >
              تخصیص به خودم
            </Button>
          </div>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            to="/dashboard/$section"
            params={{ section: isStaff ? "support-tickets" : "tickets" }}
            search={{} as never}
            className="inline-flex items-center gap-1 text-xs text-paragraph hover:text-primary"
          >
            <ArrowRight className="size-3" />
            بازگشت به فهرست تیکت‌ها
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
