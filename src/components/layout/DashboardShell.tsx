/**
 * DashboardShell — Stage 9 production-ready dashboard shell.
 *
 * Upgrades from Stage 7.1:
 *   - Dark Mode Toggle with persistence
 *   - Working Search (client-side filter across nav items)
 *   - Notification dropdown with placeholder data
 *   - Profile + Settings links in User Menu
 *   - Collapse persistence (localStorage)
 *   - Smooth theme transition
 *   - Better keyboard navigation
 */
import {
  type ReactNode,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  PlusCircle,
  Wallet,
  Inbox,
  CreditCard,
  Ticket,
  UserPlus,
  Users,
  BarChart3,
  ScrollText,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
  Search as SearchIcon,
  Bell,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NamedAvatar } from "@/components/ui/avatar";
import {
  getSectionRoute,
  ROLE_LABELS,
  SECTION_EMPTY_STATES,
  DEFAULT_SECTION,
} from "@/config/dashboard-nav";
import {
  getNavSectionsForRole,
  type NavSection,
} from "@/shared/config/navigation-v2";
import type { Role } from "@/server/db/schema";
import { site } from "@/data/site";
import { useTheme } from "@/shared/components/ThemeProvider";

const LOGO_URL = "/images/logo-header.png";
const COLLAPSE_KEY = "iec-sidebar-collapsed";

export interface DashboardShellUser {
  id: string;
  phone: string;
  email?: string | null;
  fullName: string | null;
  role: Role;
  isActive: boolean;
}

export interface DashboardShellProps {
  user: DashboardShellUser;
  currentSection: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  onLogout: () => void;
}

const SECTION_ICONS: Record<string, typeof BookOpen> = {
  "my-courses": BookOpen,
  "my-enrollments": BookOpen,
  "become-instructor": GraduationCap,
  "create-course": PlusCircle,
  "new-course": PlusCircle,
  wallet: Wallet,
  "instructor-applications": Inbox,
  "courses-review": Inbox,
  "payments-review": CreditCard,
  tickets: Ticket,
  "support-tickets": Ticket,
  "manual-enrollment": UserPlus,
  users: Users,
  "audit-log": ScrollText,
  stats: BarChart3,
  profile: User,
  settings: Settings,
};

// ============ Theme Toggle ============

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-theme-toggle]")) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <div className="relative" data-theme-toggle>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="تغییر تم"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-[var(--radius-md)] border border-border text-paragraph transition-colors hover:text-foreground"
      >
        <Icon className="size-5" />
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-2 w-44 rounded-[var(--radius-md)] border border-border bg-white p-2 shadow-float dark:bg-zinc-900">
          {(
            [
              { val: "light", label: "روشن", icon: Sun },
              { val: "dark", label: "تاریک", icon: Moon },
              { val: "system", label: "سیستم", icon: Monitor },
            ] as const
          ).map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => {
                setTheme(opt.val);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                theme === opt.val
                  ? "bg-primary/[0.06] text-primary"
                  : "text-foreground hover:bg-surface dark:hover:bg-zinc-800",
              )}
            >
              <opt.icon className="size-4" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Search ============

function DashboardSearch({ navSections }: { navSections: NavSection[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const allItems = useMemo(
    () =>
      navSections
        .flatMap((s) => s.items)
        .map((i) => ({
          label: i.label,
          href: i.href,
          slug: i.href.split("/dashboard/")[1] ?? "",
        })),
    [navSections],
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allItems
      .filter((i) => i.label.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, allItems]);

  return (
    <div className="relative hidden flex-1 max-w-xs lg:block">
      <SearchIcon className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-paragraph" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="جستجو در داشبورد..."
        aria-label="جستجو در داشبورد"
        className="h-9 w-full rounded-lg border border-border bg-surface/60 ps-9 pe-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40 focus:bg-white dark:bg-zinc-800 dark:focus:bg-zinc-900"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-[var(--radius-md)] border border-border bg-white p-2 shadow-float dark:bg-zinc-900">
          {results.map((r) => (
            <Link
              key={r.href}
              to={r.href as "/dashboard"}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface dark:hover:bg-zinc-800"
            >
              <SearchIcon className="size-3.5 text-paragraph" />
              {r.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Notification Bell ============

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "خوش آمدید",
      description: "به داشبورد IEC خوش آمدید.",
      time: "اکنون",
      unread: true,
    },
    {
      id: "2",
      title: "به‌روزرسانی سیستم",
      description: "سیستم به‌روزرسانی شد.",
      time: "۱ ساعت پیش",
      unread: true,
    },
  ]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-notif]")) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" data-notif>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="اعلان‌ها"
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-[var(--radius-md)] border border-border text-paragraph transition-colors hover:text-foreground"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute end-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
            {unreadCount.toLocaleString("fa-IR")}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-full mt-2 w-80 rounded-[var(--radius-md)] border border-border bg-white p-2 shadow-float dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-bold text-foreground">اعلان‌ها</p>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
              >
                علامت‌گذاری همه
              </button>
            </div>
            <ul className="mt-1 max-h-72 space-y-1 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg px-3 py-2 hover:bg-surface dark:hover:bg-zinc-800"
                >
                  <div className="flex items-start gap-2">
                    {n.unread && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {n.title}
                      </p>
                      <p className="text-xs text-paragraph">{n.description}</p>
                      <p className="mt-0.5 text-[10px] text-paragraph/70">
                        {n.time}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Main Component ============

export function DashboardShell({
  user,
  currentSection,
  title,
  subtitle,
  actions,
  children,
  onLogout,
}: DashboardShellProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const navSections = useMemo(
    () => getNavSectionsForRole(user.role),
    [user.role],
  );

  const navItems = useMemo(
    () =>
      navSections.flatMap((section) =>
        section.items.map((item) => {
          const sectionSlug = item.href.split("/dashboard/")[1] ?? "";
          return {
            label: item.label,
            icon: (() => {
              const I =
                SECTION_ICONS[item.href.split("/").pop() ?? ""] ?? BookOpen;
              return <I className="size-5 shrink-0" strokeWidth={2} />;
            })(),
            href: item.href,
            active: sectionSlug === currentSection,
          };
        }),
      ),
    [navSections, currentSection],
  );

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href?: string }[] = [
      { label: "داشبورد", href: "/dashboard" },
    ];
    if (title && title !== "داشبورد") crumbs.push({ label: title });
    return crumbs;
  }, [title]);

  return (
    <DashboardShellInner
      user={user}
      navSections={navSections}
      currentSection={currentSection}
      title={title}
      subtitle={subtitle}
      actions={actions}
      breadcrumbs={breadcrumbs}
      onLogout={onLogout}
      pathname={pathname}
    >
      {children}
    </DashboardShellInner>
  );
}

function DashboardShellInner({
  user,
  navSections,
  currentSection,
  title,
  subtitle,
  actions,
  breadcrumbs,
  onLogout,
  pathname,
  children,
}: {
  user: DashboardShellUser;
  navSections: NavSection[];
  currentSection: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs: { label: string; href?: string }[];
  onLogout: () => void;
  pathname: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // localStorage may be disabled (private mode) — non-fatal, the
        // in-memory state still updates for the current session.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-background dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden border-l border-border bg-white transition-all duration-300 md:block dark:border-zinc-800 dark:bg-zinc-900",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarV2Content
          navSections={navSections}
          currentSection={currentSection}
          user={user}
          onLogout={onLogout}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="w-80 max-w-[85vw] p-0 dark:bg-zinc-900"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>منوی داشبورد</SheetTitle>
          </SheetHeader>
          <SidebarV2Content
            navSections={navSections}
            currentSection={currentSection}
            user={user}
            onLogout={onLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/85 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/85">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="باز کردن منوی داشبورد"
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-[var(--radius-md)] border border-border md:hidden dark:border-zinc-700"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <nav
              className="hidden items-center gap-1 text-xs text-paragraph sm:flex"
              aria-label="مسیر ناوبری"
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-paragraph/40">/</span>}
                  {crumb.href ? (
                    <Link
                      to={crumb.href as "/dashboard"}
                      className="hover:text-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
            <div className="min-w-0 sm:hidden">
              <h1 className="truncate text-base font-bold text-foreground">
                {title}
              </h1>
            </div>
          </div>

          {/* Center: Search */}
          <DashboardSearch navSections={navSections} />

          {/* Right */}
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
            <NotificationBell />
            {/* User Menu */}
            <div className="relative" data-user-menu>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border p-1 transition-colors hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
                aria-label="منوی کاربر"
                aria-expanded={userMenuOpen}
              >
                <NamedAvatar name={user.fullName ?? user.phone} size="sm" />
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-foreground">
                    {user.fullName ?? "کاربر"}
                  </p>
                  <p className="text-xs text-paragraph">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute end-0 top-full mt-2 w-56 rounded-[var(--radius-md)] border border-border bg-white p-2 shadow-float dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="border-b border-border px-3 py-2 dark:border-zinc-700">
                    <p className="truncate text-sm font-bold text-foreground">
                      {user.fullName ?? "کاربر"}
                    </p>
                    <p dir="ltr" className="text-right text-xs text-paragraph">
                      {user.phone}
                    </p>
                    <p className="mt-0.5 text-xs text-paragraph">
                      {ROLE_LABELS[user.role]}
                    </p>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    <li>
                      <Link
                        to="/dashboard/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface dark:hover:bg-zinc-800"
                      >
                        <User className="size-4" /> پروفایل
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface dark:hover:bg-zinc-800"
                      >
                        <Settings className="size-4" /> تنظیمات
                      </Link>
                    </li>
                    <li className="border-t border-border pt-1 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-status-rejected hover:bg-status-rejected-bg"
                      >
                        <LogOut className="size-4" /> خروج
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// ============ Sidebar ============

function SidebarV2Content({
  navSections,
  currentSection,
  user,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}: {
  navSections: NavSection[];
  currentSection: string;
  user: DashboardShellUser;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn("flex items-center p-4", collapsed && "justify-center")}
      >
        <Link
          to="/"
          aria-label={site.organizer}
          className="flex items-center gap-2"
        >
          <img
            src={LOGO_URL}
            alt={`لوگوی ${site.organizer}`}
            className="h-8 w-auto object-contain"
          />
          {!collapsed && (
            <span className="text-sm font-bold text-foreground dark:text-zinc-100">
              IEC
            </span>
          )}
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2" aria-label="منوی داشبورد">
        {navSections.map((section, si) => (
          <div key={si} className="mb-4">
            {!collapsed && section.label && (
              <p className="mb-1 px-3 text-xs font-semibold text-paragraph/60 dark:text-zinc-500">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const sectionSlug = item.href.split("/dashboard/")[1] ?? "";
                const active = sectionSlug === currentSection;
                const Icon =
                  SECTION_ICONS[item.href.split("/").pop() ?? ""] ?? BookOpen;
                return (
                  <li key={item.href}>
                    <Link
                      {...getSectionRoute(sectionSlug)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all",
                        collapsed && "justify-center px-2",
                        active
                          ? "bg-primary/[0.06] text-primary"
                          : "text-foreground/80 hover:bg-surface hover:text-foreground dark:hover:bg-zinc-800 dark:text-zinc-300",
                      )}
                    >
                      <Icon
                        className="size-5 shrink-0"
                        strokeWidth={active ? 2.5 : 2}
                      />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {active && !collapsed && (
                        <span className="size-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {user && !collapsed && (
        <div className="border-t border-border p-3 dark:border-zinc-700">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-surface/60 p-3 dark:bg-zinc-800">
            <NamedAvatar name={user.fullName ?? user.phone} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.fullName ?? "کاربر"}
              </p>
              <p
                dir="ltr"
                className="truncate text-right text-xs text-paragraph"
              >
                {user.phone}
              </p>
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] text-paragraph">
            نقش: {ROLE_LABELS[user.role]}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <LogOut className="size-4" /> خروج از حساب
          </button>
        </div>
      )}
      {onToggleCollapse && (
        <div className="border-t border-border p-2 dark:border-zinc-700">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "باز کردن سایدبار" : "جمع کردن سایدبار"}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-paragraph hover:bg-surface dark:hover:bg-zinc-800"
          >
            <ChevronLeft
              className={cn(
                "size-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
            {!collapsed && <span>جمع کردن</span>}
          </button>
        </div>
      )}
    </div>
  );
}

export function getSectionEmptyState(section: string): {
  title: string;
  description: string;
} {
  return (
    SECTION_EMPTY_STATES[section] ?? {
      title: "این بخش هنوز در دست ساخت است",
      description: "محتوای این صفحه در مراحل بعدی اضافه خواهد شد.",
    }
  );
}
export { DEFAULT_SECTION };
