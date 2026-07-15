import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { FAQSection } from "@/components/sections/FAQSection";
import { homeFaqs } from "@/data/faqs";
import { site } from "@/data/site";
import { faqJsonLd, breadcrumb, jsonLdScript } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: `سوالات متداول | ${site.shortName}` },
      {
        name: "description",
        content: `پاسخ سوالات پرتکرار درباره مرکز و دوره‌های برگزار شده ${site.name}.`,
      },
      { property: "og:title", content: `سوالات متداول | ${site.shortName}` },
      {
        property: "og:description",
        content: "پاسخ به سوالات پرتکرار درباره مرکز و دوره‌های برگزار شده.",
      },
      { property: "og:url", content: "/faq" },
      { property: "og:image", content: "/images/og-default.jpg" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: `سوالات متداول | ${site.shortName}` },
      { name: "twitter:description", content: "پاسخ به سوالات پرتکرار." },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      jsonLdScript(faqJsonLd(homeFaqs)),
      jsonLdScript(
        breadcrumb([
          { name: "صفحه اصلی", item: "/" },
          { name: "سوالات متداول", item: "/faq" },
        ]),
      ),
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="pt-20">
        <Container>
          <h1 className="sr-only">سوالات متداول</h1>
        </Container>
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
