import { Section, SectionHeader } from "@/components/layout/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { homeFaqs } from "@/data/faqs";
import { Reveal } from "@/components/motion/Reveal";

export function FAQSection({
  faqs = homeFaqs,
  title = "سوالات متداول",
}: {
  faqs?: { q: string; a: string }[];
  title?: string;
}) {
  return (
    <Section className="bg-surface">
      <div className="mb-10">
        <SectionHeader
          title={title}
          subtitle="هرچه لازم است درباره دوره‌های آموزشی بدانید"
        />
      </div>
      <Reveal className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="overflow-hidden rounded-[20px] border border-border bg-white px-5 shadow-card"
            >
              <AccordionTrigger className="py-4 text-right text-[14px] font-bold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[13px] leading-7 text-paragraph">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </Section>
  );
}
