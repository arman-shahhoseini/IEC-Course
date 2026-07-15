import { motion } from "framer-motion";
import { Section } from "@/components/layout/Section";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { features } from "@/data/features";
import { stagger, viewportOnce } from "@/lib/motion";

export function Features() {
  return (
    <Section className="!py-10 md:!py-14">
      <motion.div
        variants={stagger(0.06)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
      >
        {features.map((f) => (
          <FeatureCard key={f.title} feature={f} />
        ))}
      </motion.div>
    </Section>
  );
}
