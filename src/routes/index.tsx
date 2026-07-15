import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { CoursesSection } from "@/components/sections/CoursesSection";
import { CategoriesSection } from "@/components/sections/CategoriesSection";
import { WhyIEC } from "@/components/sections/WhyIEC";
import { Features } from "@/components/sections/Features";
import { StatsSection } from "@/components/sections/StatsSection";
import { TeachersSection } from "@/components/sections/TeachersSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PlatformCapabilities } from "@/components/sections/PlatformCapabilities";
import { DashboardPreview } from "@/components/sections/DashboardPreview";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { Phone, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { site } from "@/data/site";
import { faqJsonLd, jsonLdScript } from "@/lib/seo";
import { homeFaqs } from "@/data/faqs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${site.name} | ${site.tagline}` },
      { name: "description", content: site.description },
      { property: "og:title", content: `${site.name} | ${site.tagline}` },
      { property: "og:description", content: site.description },
      { property: "og:url", content: "/" },
      { property: "og:image", content: "/images/og-default.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: site.name },
      { name: "twitter:description", content: site.description },
      { name: "twitter:image", content: "/images/og-default.jpg" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [jsonLdScript(faqJsonLd(homeFaqs))],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />

        {/* How it works */}
        <HowItWorks />

        {/* Courses */}
        <CoursesSection />

        {/* Platform capabilities */}
        <PlatformCapabilities />

        {/* Dashboard preview */}
        <DashboardPreview />

        {/* Categories */}
        <CategoriesSection />

        {/* Why IEC */}
        <WhyIEC />

        {/* Features */}
        <Features />

        {/* Statistics */}
        <StatsSection />

        {/* Teachers */}
        <TeachersSection />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* FAQ */}
        <FAQSection />

        {/* Premium Final CTA */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 gradient-mesh"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 end-[-5%] size-[400px] rounded-full opacity-[0.06]"
            style={{
              background:
                "radial-gradient(closest-side, var(--primary), transparent 70%)",
            }}
          />
          <Container>
            <Reveal className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/90 px-4 py-2 text-[12px] font-semibold text-primary">
                <Sparkles className="size-3.5" />
                همین امروز شروع کنید
              </span>
              <h2 className="mt-6 text-3xl font-extrabold md:text-5xl">
                آماده‌ی شروع یادگیری هستید؟
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-8 text-paragraph md:text-base">
                هم‌اکنون با کارشناسان آموزشی ما در ارتباط باشید تا بهترین مسیر
                یادگیری را برای هدف شغلی شما پیدا کنیم.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/courses"
                  className="group inline-flex items-center gap-2 rounded-[18px] bg-primary px-8 py-4 text-[15px] font-bold text-white shadow-glow transition-all hover:bg-primary-hover hover:scale-[1.02] btn-shine"
                >
                  شروع یادگیری
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-[18px] border border-border bg-white/90 px-8 py-4 text-[15px] font-bold text-foreground transition-all hover:bg-white"
                >
                  ورود به پنل
                </Link>
                <a
                  href={`tel:${site.phone}`}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-primary/20 bg-primary/[0.04] px-8 py-4 text-[15px] font-bold text-primary transition-all hover:bg-primary/[0.08]"
                >
                  <Phone className="size-4" strokeWidth={2} />
                  مشاوره آموزشی
                </a>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
