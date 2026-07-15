/**
 * Shared Dashboard Widgets — reusable components for all dashboard panels.
 *
 * These widgets are used by Student, Instructor, Support, and Admin
 * dashboards. They use the Foundation Components and Design Tokens
 * from Stage 7.
 *
 * No business logic — just presentation components that take data as props.
 */
import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  type LucideIcon,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  BarChart3,
  ScrollText,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  StatisticCard,
  PageHeader,
  SectionHeader,
  EmptyState,
  FoundationSkeleton,
} from "@/shared/components/foundation";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasPermission, type Permission } from "@/shared/rbac/permissions";
import type { Role } from "@/server/db/schema";
import { staggerContainer, staggerItem } from "@/shared/lib/motion-presets";

/* ------------------------------------------------------------------ */
/* Statistics Grid                                                     */
/* ------------------------------------------------------------------ */

export interface StatItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  href?: string;
}

export function StatisticsGrid({
  items,
  loading,
}: {
  items: StatItem[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card"
          >
            <FoundationSkeleton className="mb-3 h-4 w-1/2" />
            <FoundationSkeleton className="h-8 w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {items.map((item, i) => (
        <motion.div key={i} variants={staggerItem}>
          <StatisticCard
            label={item.label}
            value={item.value}
            icon={item.icon}
            trend={item.trend}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick Actions                                                       */
/* ------------------------------------------------------------------ */

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  permission?: Permission;
  variant?: "default" | "outline";
}

export function QuickActions({
  actions,
  role,
}: {
  actions: QuickAction[];
  role: Role;
}) {
  const visible = actions.filter(
    (a) => !a.permission || hasPermission(role, a.permission),
  );
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((action, i) => {
        const Icon = action.icon;
        return (
          <Link
            key={i}
            to={action.href as "/dashboard"}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-all",
              action.variant === "outline"
                ? "border border-border bg-white text-foreground hover:bg-surface"
                : "bg-primary text-white shadow-red hover:bg-primary-hover",
            )}
          >
            <Icon className="size-4" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity Timeline                                                   */
/* ------------------------------------------------------------------ */

export interface ActivityItem {
  action: string;
  description: string;
  time: string;
  icon?: LucideIcon;
}

export function ActivityTimeline({
  items,
  loading,
  empty = "فعالیتی ثبت نشده است",
}: {
  items: ActivityItem[];
  loading?: boolean;
  empty?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <FoundationSkeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-paragraph">{empty}</div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const Icon = item.icon ?? Clock;
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-white p-3"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-paragraph">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.description}
              </p>
              <p className="text-xs text-paragraph">{item.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status Card (summary card with status badge)                        */
/* ------------------------------------------------------------------ */

export function StatusCard({
  title,
  count,
  href,
  status,
  label,
  icon: Icon,
}: {
  title: string;
  count: number;
  href?: string;
  status: "pending" | "success" | "rejected" | "draft";
  label: string;
  icon: LucideIcon;
}) {
  const content = (
    <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-lg bg-surface text-paragraph">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-paragraph">{title}</p>
          <p className="text-xl font-extrabold text-foreground">
            {count.toLocaleString("fa-IR")}
          </p>
        </div>
      </div>
      <StatusBadge status={status} label={label} />
    </div>
  );
  if (href) {
    return <Link to={href as "/dashboard"}>{content}</Link>;
  }
  return content;
}

/* ------------------------------------------------------------------ */
/* Real Chart (recharts)                                               */
/* ------------------------------------------------------------------ */

export function RealChart({
  title = "نمودار",
  data,
  height = 200,
}: {
  title?: string;
  data?: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const chartData = data ?? [
    { label: "فروردین", value: 12 },
    { label: "اردیبهشت", value: 19 },
    { label: "خرداد", value: 15 },
    { label: "تیر", value: 25 },
    { label: "مرداد", value: 22 },
    { label: "شهریور", value: 30 },
    { label: "مهر", value: 28 },
  ];

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="size-5 text-paragraph" />
        <h3 className="text-sm font-bold text-foreground dark:text-zinc-100">
          {title}
        </h3>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c1121f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#c1121f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fontFamily: "Vazirmatn" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #ececec",
                fontFamily: "Vazirmatn",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#c1121f"
              strokeWidth={2}
              fill="url(#chartGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Import recharts components (kept inside function scope for lazy loading friendliness)
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Chart Placeholder (kept for backward compat)                        */
/* ------------------------------------------------------------------ */

export function ChartPlaceholder({
  title = "نمودار",
  height = 200,
}: {
  title?: string;
  height?: number;
}) {
  return <RealChart title={title} height={height} />;
}

/* ------------------------------------------------------------------ */
/* Profile Widget                                                      */
/* ------------------------------------------------------------------ */

export function ProfileWidget({
  name,
  phone,
  role,
  roleLabel,
}: {
  name: string;
  phone: string;
  role: Role;
  roleLabel: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-xl font-bold text-primary">
          {name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-foreground">{name}</p>
          <p dir="ltr" className="truncate text-right text-sm text-paragraph">
            {phone}
          </p>
          <span className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-paragraph">
            {roleLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wallet Widget                                                       */
/* ------------------------------------------------------------------ */

export function WalletWidget({
  balance,
  loading,
  href,
}: {
  balance: number;
  loading?: boolean;
  href?: string;
}) {
  const content = (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-paragraph">موجودی کیف‌پول</p>
          {loading ? (
            <FoundationSkeleton className="mt-1 h-8 w-32" />
          ) : (
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {balance.toLocaleString("fa-IR")}{" "}
              <span className="text-sm font-normal text-paragraph">تومان</span>
            </p>
          )}
        </div>
        <div className="grid size-12 place-items-center rounded-full bg-primary/10">
          <svg
            className="size-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M16 12h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {href && (
        <Link
          to={href as "/dashboard"}
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          مشاهده جزئیات
          <ArrowLeft className="size-3" />
        </Link>
      )}
    </div>
  );
  return content;
}

/* ------------------------------------------------------------------ */
/* Announcements Widget                                                 */
/* ------------------------------------------------------------------ */

export function AnnouncementsWidget() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-bold text-foreground">اعلانات</h3>
      <div className="space-y-2">
        <div className="rounded-[var(--radius-md)] bg-status-pending-bg p-3 text-sm text-status-pending">
          سیستم در حال به‌روزرسانی است. ممکن است برخی قابلیت‌ها موقتاً در دسترس
          نباشند.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard Section (wrapper with header)                             */
/* ------------------------------------------------------------------ */

export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <SectionHeader title={title} description={description} action={action} />
      {children}
    </div>
  );
}
