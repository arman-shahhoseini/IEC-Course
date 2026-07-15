import { motion } from "framer-motion";
import { Section, SectionHeader } from "@/components/layout/Section";
import { WhyCard } from "@/components/cards/FeatureCard";
import { whyItems } from "@/data/features";
import { stagger, viewportOnce } from "@/lib/motion";

export function WhyIEC() {
  return (
    <Section className="bg-surface">
      <div className="mb-12">
        <SectionHeader
          title="چرا دوره‌های ما را انتخاب کنید؟"
          subtitle="مزایایی که یادگیری شما را تضمین می‌کنند"
        />
      </div>
      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
      >
        {whyItems.map((f) => (
          <WhyCard key={f.title} feature={f} />
        ))}
      </motion.div>
    </Section>
  );
}
