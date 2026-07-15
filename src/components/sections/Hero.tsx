import { Link } from "@tanstack/react-router";
import {
  Phone,
  BookOpen,
  Building2,
  LayoutGrid,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { site } from "@/data/site";
import { courseCategories } from "@/data/teachers";

const stats = [
  { icon: BookOpen, value: "۶۵+", label: "دوره آموزشی" },
  {
    icon: LayoutGrid,
    value: courseCategories.length.toLocaleString("fa-IR"),
    label: "حوزه تخصصی",
  },
  { icon: Building2, value: "۱۴۰۱", label: "سال تاسیس" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-32 lg:pt-36">
      {/* Animated mesh gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 gradient-mesh"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 end-[-10%] size-[600px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(closest-side, var(--primary), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 start-[-8%] size-[400px] rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(closest-side, var(--gold), transparent 70%)",
        }}
      />

      {/* Decorative shapes — static (removed infinite animations that
          consumed CPU/GPU continuously on mobile). */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 end-[10%] hidden size-24 rounded-2xl border border-primary/10 lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 start-[5%] hidden size-16 rounded-full border border-gold/20 lg:block"
      />

      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          {/* Text column — CSS animations (not framer-motion) so content
              is visible in SSR HTML. Animation is progressive enhancement. */}
          <div className="order-2 lg:order-1">
            {/* Premium badge */}
            <span className="animate-fade-up-stagger-1 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-[12px] font-semibold text-paragraph shadow-sm">
              <Sparkles className="size-3.5 text-primary" />
              ارائه شده توسط مرکز کارآفرینی بین‌المللی دانشگاه شمال
            </span>

            <h1 className="animate-fade-up-stagger-2 mt-6 text-[34px] font-extrabold leading-[1.12] tracking-tight text-foreground sm:text-[44px] md:text-[54px] lg:text-[60px]">
              مهارت‌هایی که آینده
              <br />
              <span className="gradient-hero-text">شغلی شما را می‌سازند</span>
            </h1>

            <p className="animate-fade-up-stagger-3 mt-6 max-w-xl text-[15px] leading-8 text-paragraph sm:text-[16px] md:text-[17px]">
              دوره‌های جامع مهارت‌محور، کارگاه‌های تخصصی و آموزش‌های کاربردی —
              با مدرسان متخصص، یادگیری پروژه‌محور و تجربه واقعی برای ورود به
              بازار کار.
            </p>

            <div className="animate-fade-up-stagger-4 mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/courses"
                className="group inline-flex items-center gap-2 rounded-[18px] bg-primary px-7 py-4 text-[15px] font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.02] btn-shine"
              >
                مشاهده دوره‌ها
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              </Link>
              <a
                href={`tel:${site.phone}`}
                className="inline-flex items-center gap-2 rounded-[18px] border border-border bg-white/90 px-7 py-4 text-[15px] font-bold text-foreground transition-all hover:border-foreground/20 hover:bg-white"
              >
                <Phone className="size-4" strokeWidth={2} />
                مشاوره رایگان
              </a>
            </div>

            {/* Trust badges */}
            <div className="animate-fade-up-stagger-5 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-paragraph">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-status-success" />
                بدون پیش‌نیاز
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-status-success" />
                گواهی پایان دوره
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-status-success" />
                پشتیبانی مستقیم
              </span>
            </div>
          </div>

          {/* Image column with floating glass stats */}
          <div className="animate-fade-in relative order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-premium">
              <picture>
                <source
                  srcSet="/images/hero-mobile.webp"
                  media="(max-width: 640px)"
                  type="image/webp"
                />
                <source
                  srcSet="/images/hero-tablet.webp"
                  media="(max-width: 1024px)"
                  type="image/webp"
                />
                <source
                  srcSet="/images/hero-desktop.webp"
                  media="(max-width: 1920px)"
                  type="image/webp"
                />
                <source srcSet="/images/hero-large.webp" type="image/webp" />
                <img
                  src="/images/hero-desktop.jpg"
                  alt="محل برگزاری دوره‌ها و کارگاه‌های آموزشی"
                  width={1600}
                  height={1200}
                  loading="eager"
                  fetchPriority="high"
                  className="size-full object-cover"
                />
              </picture>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>

            {/* Floating glass stats card — CSS animation (no framer-motion) */}
            <div className="animate-fade-up-stagger-5 absolute -bottom-6 start-4 end-4 md:-bottom-8 md:start-6 md:end-auto md:w-[calc(100%-3rem)]">
              <div className="grid grid-cols-3 gap-2 rounded-[22px] glass p-3 shadow-premium md:gap-4 md:p-5">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl px-2 py-3 text-center"
                  >
                    <div className="mx-auto grid size-10 place-items-center rounded-xl bg-primary/[0.08] text-primary md:size-12">
                      <s.icon className="size-5" strokeWidth={1.8} />
                    </div>
                    <div className="mt-2 text-[16px] font-extrabold text-foreground md:text-[20px]">
                      {s.value}
                    </div>
                    <div className="text-[10px] text-paragraph md:text-[12px]">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
      <div className="h-14 md:h-20" />
    </section>
  );
}
