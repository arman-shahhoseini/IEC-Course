import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/Section";
import { testimonials } from "@/data/teachers";
import { fadeUp, viewportOnce } from "@/lib/motion";

export function TestimonialsSection() {
  if (testimonials.length === 0) return null;

  return (
    <Section className="bg-surface">
      <SectionHeader
        title="نظر دانش‌پذیران ما"
        subtitle="تجربه کسانی که در دوره‌های مرکز شرکت کرده‌اند"
      />
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {testimonials.map((t) => (
          <article
            key={t.name}
            className="flex flex-col rounded-[24px] border border-border bg-white p-6 shadow-card"
          >
            <Quote className="size-6 text-primary/60" />
            <p className="mt-3 flex-1 text-[13.5px] leading-8 text-paragraph">
              {t.quote}
            </p>
            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              <div className="grid size-12 place-items-center rounded-full bg-primary/[0.06] text-[14px] font-bold text-primary">
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="text-[13px] font-bold text-foreground">
                  {t.name}
                </div>
                <div className="text-[11px] text-paragraph">{t.role}</div>
              </div>
            </div>
          </article>
        ))}
      </motion.div>
    </Section>
  );
}
