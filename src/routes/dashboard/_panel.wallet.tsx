/**
 * /dashboard/wallet — instructor's wallet (balance + transaction history).
 *
 * Access: any authenticated user, but only meaningful for instructors.
 * Students/support will see an empty wallet (balance 0, no transactions).
 */
import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  Loader2,
  Wallet as WalletIcon,
  ArrowDownCircle,
  ArrowUpCircle,
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
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { site } from "@/data/site";
import {
  getMyWallet,
  type WalletWithTransactions,
} from "@/server/auth/enrollments.functions";

export const Route = createFileRoute("/dashboard/_panel/wallet")({
  head: () => ({
    meta: [{ title: `کیف‌پول من | ${site.shortName}` }],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<WalletWithTransactions | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* network error */
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const result = await getMyWallet();
      setData(result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "بارگذاری کیف‌پول با خطا مواجه شد.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [auth, toast]);

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

  const balance = data?.wallet?.balance ?? 0;

  return (
    <DashboardShell
      user={auth.user}
      currentSection="wallet"
      title="کیف‌پول من"
      subtitle="موجودی و تاریخچه‌ی تراکنش‌ها"
      onLogout={handleLogout}
    >
      <div className="space-y-5">
        {/* Balance card */}
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-primary/10">
              <WalletIcon className="size-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-paragraph">موجودی فعلی</p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">
                {balance.toLocaleString("fa-IR")}{" "}
                <span className="text-base font-normal text-paragraph">
                  تومان
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !data || data.transactions.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
            <EmptyState
              icon={WalletIcon}
              title="هنوز تراکنشی ثبت نشده است"
              description="پس از تایید ثبت‌نام دانشجوها توسط پشتیبان، مبلغ تسویه به کیف‌پول شما اضافه می‌شود."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>توضیحات</TableHead>
                <TableHead>تاریخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      {tx.type === "credit" ? (
                        <>
                          <ArrowDownCircle className="size-4 text-status-success" />
                          <span className="text-status-success">واریز</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="size-4 text-status-rejected" />
                          <span className="text-status-rejected">برداشت</span>
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {tx.amount.toLocaleString("fa-IR")} تومان
                  </TableCell>
                  <TableCell className="max-w-md text-paragraph">
                    {tx.description}
                  </TableCell>
                  <TableCell className="text-paragraph">
                    {new Date(tx.createdAt).toLocaleDateString("fa-IR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardShell>
  );
}
