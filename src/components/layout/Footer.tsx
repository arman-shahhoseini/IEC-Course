import { Link } from "@tanstack/react-router";
import {
  Instagram,
  Linkedin,
  Send,
  MapPin,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";
import { site } from "@/data/site";
import { Container } from "./Container";
import { AccountButton } from "./AccountButton";

const LOGO_URL = "/images/logo-header.png";

// Build-time flag — `vite.config.ts` `define` replaces this with the
// literal boolean. UX-only — controls whether the demo link is shown.
const DEMO_MODE = import.meta.env.DEMO_MODE;

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-gradient-to-b from-white to-surface">
      {/* Decorative top gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <Container className="py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:order-5">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_URL}
                alt={`لوگوی ${site.organizer}`}
                className="h-11 w-auto object-contain"
                width={44}
                height={44}
              />
            </div>
            <p className="mt-4 text-sm leading-7 text-paragraph">
              دوره‌های جامع مهارت‌محور، کارگاه‌های تخصصی و آموزش‌های کاربردی —
              یادگیری پروژه‌محور برای رشد شغلی شما.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href={site.socials.instagram}
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
                className="grid size-9 place-items-center rounded-lg border border-border text-foreground transition-all hover:border-primary hover:text-primary hover:scale-105"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href={site.socials.telegram}
                aria-label="Telegram"
                target="_blank"
                rel="noreferrer"
                className="grid size-9 place-items-center rounded-lg border border-border text-foreground transition-all hover:border-primary hover:text-primary hover:scale-105"
              >
                <Send className="size-4" />
              </a>
              <a
                href={site.socials.linkedin}
                aria-label="LinkedIn"
                target="_blank"
                rel="noreferrer"
                className="grid size-9 place-items-center rounded-lg border border-border text-foreground transition-all hover:border-primary hover:text-primary hover:scale-105"
              >
                <Linkedin className="size-4" />
              </a>
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-foreground">
              حساب کاربری
            </h2>
            <div className="space-y-2.5 text-sm">
              <AccountButton variant="inline" />
              {DEMO_MODE && (
                <div>
                  <Link
                    to="/demo"
                    className="inline-flex items-center gap-1.5 text-gold transition-colors hover:text-gold/80"
                  >
                    <Sparkles className="size-3.5" />
                    مشاهده دمو
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-foreground">
              دسته‌بندی دوره‌ها
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/courses"
                  className="text-paragraph transition-colors hover:text-primary"
                >
                  برنامه‌نویسی
                </Link>
              </li>
              <li>
                <Link
                  to="/courses"
                  className="text-paragraph transition-colors hover:text-primary"
                >
                  مهندسی
                </Link>
              </li>
              <li>
                <Link
                  to="/courses"
                  className="text-paragraph transition-colors hover:text-primary"
                >
                  مالی و حسابداری
                </Link>
              </li>
              <li>
                <Link
                  to="/courses"
                  className="text-paragraph transition-colors hover:text-primary"
                >
                  مدیریت
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-foreground">
              اطلاعات تماس
            </h2>
            <ul className="space-y-3 text-sm text-paragraph">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <div dir="ltr" className="text-right">
                    {site.phoneDisplay}
                  </div>
                  <div dir="ltr" className="text-right">
                    {site.mobileDisplay}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <span dir="ltr">{site.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{site.address}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-paragraph md:flex-row">
          <p>
            ©{" "}
            {new Date()
              .getFullYear()
              .toLocaleString("fa-IR", { useGrouping: false })}{" "}
            — تمامی حقوق برای {site.organizer} محفوظ است.
          </p>
          <p className="flex items-center gap-1.5">
            طراحی شده با
            <Sparkles className="size-3 text-primary" />
            توسط مرکز کارآفرینی بین‌المللی
          </p>
        </div>
      </Container>
    </footer>
  );
}
