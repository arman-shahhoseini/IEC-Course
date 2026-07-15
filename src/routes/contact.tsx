import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { ContactCard } from "@/components/sections/ContactCard";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/data/site";
import { jsonLdScript, localBusinessJsonLd, breadcrumb } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `مشاوره و ثبت‌نام | ${site.shortName}` },
      {
        name: "description",
        content: `مشاوره آموزشی و ثبت‌نام دوره‌ها — تلفن، واتساپ، آدرس و ساعت کاری.`,
      },
      { property: "og:title", content: `مشاوره و ثبت‌نام | ${site.shortName}` },
      {
        property: "og:description",
        content: `برای انتخاب دوره و ثبت‌نام با ما در ارتباط باشید.`,
      },
      { property: "og:url", content: "/contact" },
      { property: "og:image", content: "/images/og-default.jpg" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: `مشاوره و ثبت‌نام | ${site.shortName}`,
      },
      {
        name: "twitter:description",
        content: `برای انتخاب دوره و ثبت‌نام با ما در ارتباط باشید.`,
      },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
    scripts: [
      jsonLdScript(localBusinessJsonLd()),
      jsonLdScript(
        breadcrumb([
          { name: "صفحه اصلی", item: "/" },
          { name: "مشاوره و ثبت‌نام", item: "/contact" },
        ]),
      ),
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="pt-28 pb-24 md:pt-32">
        <Container>
          <Reveal className="mb-10 text-center">
            <span className="text-[13px] font-semibold text-primary">
              مشاوره و ثبت‌نام
            </span>
            <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
              مشاوره آموزشی و ثبت‌نام
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-paragraph">
              کارشناسان آموزشی ما آماده راهنمایی شما برای انتخاب بهترین دوره و
              مسیر یادگیری هستند.
            </p>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <ContactCard />
            <Reveal
              delay={0.1}
              className="overflow-hidden rounded-[24px] border border-border shadow-card"
            >
              <iframe
                title="نقشه مرکز"
                src={site.mapEmbed}
                className="h-full min-h-[420px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Reveal>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
