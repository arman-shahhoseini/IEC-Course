import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, Phone, X, ChevronLeft, Sparkles } from "lucide-react";
import { navItems } from "@/data/nav";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";
import { AccountButton } from "./AccountButton";

const LOGO_URL = "/images/logo-header.png";

// Build-time flag — `vite.config.ts` `define` replaces this with the
// literal boolean. UX-only — controls Navbar/Footer demo link
// visibility, NOT the actual demo OTP behavior (which is server-side).
const DEMO_MODE = import.meta.env.DEMO_MODE;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <header
      className={cn(
        "animate-fade-in fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border glass shadow-sm"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3"
          aria-label={site.organizer}
        >
          <img
            src={LOGO_URL}
            alt={`لوگوی ${site.organizer}`}
            className="h-9 w-auto object-contain md:h-11"
            width={44}
            height={44}
          />
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="ناوبری اصلی"
        >
          {navItems.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-4 py-2 text-[15px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-foreground/70 hover:text-foreground hover:bg-white/50",
                )}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {DEMO_MODE && (
            <Link
              to="/demo"
              className="hidden items-center gap-1.5 rounded-[14px] border border-gold/30 bg-gold/[0.06] px-3.5 py-2.5 text-[13px] font-bold text-gold transition-all hover:bg-gold/[0.1] hover:scale-[1.02] md:inline-flex"
              aria-label="مشاهده‌ی دمو محیط کاربری"
              title="محیط آزمایشی برای سرمایه‌گذاران — ورود سریع با نقش‌های مختلف"
            >
              <Sparkles className="size-3.5" strokeWidth={2.2} />
              مشاهده دمو
            </Link>
          )}
          <a
            href={`tel:${site.phone}`}
            className="hidden items-center gap-2 rounded-[14px] border border-border bg-white/80 px-4 py-2.5 text-[13px] font-bold text-foreground backdrop-blur-xl transition-all hover:bg-white hover:scale-[1.02] lg:inline-flex"
          >
            <Phone className="size-4" strokeWidth={2.2} />
            مشاوره آموزشی
          </a>
          <AccountButton />
          <button
            aria-label="باز کردن منو"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-11 place-items-center rounded-xl border border-border glass lg:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 start-0 w-80 max-w-[85vw] glass p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <img
                  src={LOGO_URL}
                  alt={`لوگوی ${site.organizer}`}
                  className="h-9 w-auto object-contain"
                />
                <button
                  aria-label="بستن منو"
                  onClick={() => setOpen(false)}
                  className="grid size-10 place-items-center rounded-lg border border-border"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav
                className="mt-8 flex flex-col gap-1"
                aria-label="ناوبری موبایل"
              >
                {navItems.map((item) => {
                  const active =
                    item.to === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors",
                        active
                          ? "bg-primary/[0.06] text-primary"
                          : "text-foreground hover:bg-white/50",
                      )}
                    >
                      {item.label}
                      {active && (
                        <ChevronLeft className="size-4 text-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                <AccountButton variant="inline" />
                {DEMO_MODE && (
                  <Link
                    to="/demo"
                    onClick={() => setOpen(false)}
                    className="mt-2 flex items-center justify-center gap-2 rounded-[16px] border border-gold/30 bg-gold/[0.06] px-4 py-3 font-bold text-gold"
                  >
                    <Sparkles className="size-4" />
                    مشاهده دمو
                  </Link>
                )}
                <a
                  href={`tel:${site.phone}`}
                  className="flex items-center justify-center gap-2 rounded-[16px] bg-primary px-4 py-3 font-bold text-white shadow-glow"
                >
                  <Phone className="size-4" />
                  مشاوره آموزشی
                </a>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
