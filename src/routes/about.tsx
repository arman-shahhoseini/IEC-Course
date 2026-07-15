import { createFileRoute } from "@tanstack/react-router";
import {
  GraduationCap,
  BadgeCheck,
  Monitor,
  Briefcase,
  Award,
  Users,
  Target,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { WhyIEC } from "@/components/sections/WhyIEC";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/data/site";
import { breadcrumb, jsonLdScript } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `درباره دوره‌ها | ${site.shortName}` },
      {
        name: "description",
        content: `درباره دوره‌های جامع مهارت‌محور — آموزش پروژه‌محور با مدرسان متخصص و گواهی پایان دوره.`,
      },
      { property: "og:title", content: `درباره دوره‌ها | ${site.shortName}` },
      {
        property: "og:description",
        content: `آموزش پروژه‌محور، مدرسان متخصص، گواهی پایان دوره معتبر.`,
      },
      { property: "og:image", content: "/images/hero-desktop.jpg" },
      { property: "og:url", content: "/about" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `درباره دوره‌ها | ${site.shortName}` },
      {
        name: "twitter:description",
        content: `آموزش پروژه‌محور، مدرسان متخصص، گواهی پایان دوره.`,
      },
      { name: "twitter:image", content: "/images/hero-desktop.jpg" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
    scripts: [
      jsonLdScript(
        breadcrumb([
          { name: "صفحه اصلی", item: "/" },
          { name: "درباره دوره‌ها", item: "/about" },
        ]),
      ),
    ],
  }),
  component: AboutPage,
});

const educationValues = [
  {
    icon: GraduationCap,
    title: "آموزش پروژه‌محور",
    desc: "در دوره‌های ما، یادگیری از طریق پروژه‌های واقعی انجام می‌شود. شما مهارت‌ها را با ساختن محصولات واقعی فرا می‌گیرید، نه فقط تئوری.",
  },
  {
    icon: Monitor,
    title: "کارگاه‌های تخصصی",
    desc: "بیشتر دوره‌ها در قالب کارگاه‌های عملی برگزار می‌شوند تا دانش‌پذیران به‌صورت دست‌به‌آچار با ابزارها و تکنیک‌های واقعی کار کنند.",
  },
  {
    icon: Award,
    title: "مدرسان متخصص",
    desc: "مدرسین ما از متخصصان مجرب در صنعت هستند که تجربه واقعی بازار کار را به کلاس درس می‌آورند.",
  },
  {
    icon: BadgeCheck,
    title: "گواهی پایان دوره",
    desc: "پس از پایان هر دوره، گواهی‌نامه معتبر به شما ارائه می‌شود که نشان‌دهنده تسلط شما بر مهارت‌های آموزش‌دیده است.",
  },
  {
    icon: Briefcase,
    title: "آمادگی شغلی",
    desc: "هر دوره برای یک مسیر شغلی مشخص طراحی شده است. مهارت‌هایی که یاد می‌گیرید مستقیماً در بازار کار قابل استفاده هستند.",
  },
  {
    icon: Target,
    title: "هدف‌گذاری شغلی",
    desc: "ما به شما کمک می‌کنیم مسیر یادگیری مناسبی برای هدف شغلی خود پیدا کنید.",
  },
];

function AboutPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="pt-28 md:pt-32">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <span className="text-[13px] font-semibold text-primary">
                درباره دوره‌ها
              </span>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-5xl">
                آموزش مهارت‌های واقعی برای رشد شغلی شما
              </h1>
              <p className="mt-4 text-[15px] leading-8 text-paragraph">
                این پلتفرم، دوره‌های جامع مهارت‌محور، کارگاه‌های تخصصی و
                آموزش‌های کاربردی را ارائه می‌دهد — دوره‌هایی که با رویکردی
                پروژه‌محور طراحی شده‌اند تا شما مهارت‌های واقعی و قابل استفاده
                در بازار کار را یاد بگیرید.
              </p>
              <p className="mt-4 text-[15px] leading-8 text-paragraph">
                با بیش از ۶۵ دوره برگزار شده در حوزه‌های برنامه‌نویسی، مهندسی،
                مالی، مدیریت، فناوری و سلامت، ما مسیر یادگیری مناسبی برای هر هدف
                شغلی فراهم کرده‌ایم. تمامی دوره‌ها با مدرسان متخصص و گواهی پایان
                دوره ارائه می‌شوند.
              </p>
              <p className="mt-4 text-[13px] leading-7 text-paragraph">
                ارائه شده توسط {site.organizer}.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="overflow-hidden rounded-[28px] shadow-float">
                <picture>
                  <source
                    srcSet="/images/hero-desktop.webp"
                    type="image/webp"
                  />
                  <img
                    src="/images/hero-desktop.jpg"
                    alt="محل برگزاری دوره‌ها و کارگاه‌های آموزشی"
                    className="aspect-[4/3] w-full object-cover"
                    width={1600}
                    height={1200}
                    loading="lazy"
                  />
                </picture>
              </div>
            </Reveal>
          </div>

          {/* Teaching philosophy */}
          <Reveal className="mt-20 max-w-3xl">
            <h2 className="text-2xl font-extrabold md:text-3xl">
              فلسفه آموزشی ما
            </h2>
            <p className="mt-4 text-[15px] leading-8 text-paragraph">
              ما باور داریم که یادگیری واقعی از طریق عمل اتفاق می‌افتد. به همین
              دلیل، دوره‌های ما بر اساس پروژه‌های واقعی طراحی شده‌اند. شما در
              طول دوره، محصولاتی واقعی می‌سازید، مشکلات واقعی را حل می‌کنید و
              مهارت‌هایی را که مستقیماً در شغل خود استفاده می‌کنید، تمرین
              می‌کنید.
            </p>
            <p className="mt-4 text-[15px] leading-8 text-paragraph">
              مدرسین ما نه تنها teachers هستند، بلکه practitioners هستند —
              افرادی که در صنعت فعال هستند و تجربه واقعی را به کلاس می‌آورند.
            </p>
          </Reveal>

          {/* Education values grid */}
          <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {educationValues.map((value, i) => {
              const Icon = value.icon;
              return (
                <Reveal key={value.title} delay={i * 0.05}>
                  <div className="h-full rounded-[24px] border border-border bg-white p-6 shadow-card transition-shadow duration-500 hover:shadow-card-hover">
                    <div className="grid size-12 place-items-center rounded-2xl bg-primary/[0.06] text-primary">
                      <Icon className="size-6" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-4 text-[16px] font-bold text-foreground">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-7 text-paragraph">
                      {value.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
        <div className="h-16" />
        <WhyIEC />
      </main>
      <Footer />
    </>
  );
}
