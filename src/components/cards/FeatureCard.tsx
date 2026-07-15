import { motion } from "framer-motion";
import type { Feature } from "@/types";
import { fadeUp } from "@/lib/motion";

export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      className="group flex flex-col items-center rounded-[20px] border border-border bg-white p-5 text-center shadow-card card-premium"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-primary/[0.06] text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-[14px] font-bold text-foreground">
        {feature.title}
      </h3>
      <p className="mt-1 text-[12px] leading-5 text-paragraph">
        {feature.desc}
      </p>
    </motion.div>
  );
}

export function WhyCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      className="flex items-start gap-4 rounded-[20px] border border-border bg-white p-6 shadow-card card-premium"
    >
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/[0.06] text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white">
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-foreground">
          {feature.title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-6 text-paragraph">
          {feature.desc}
        </p>
      </div>
    </motion.div>
  );
}
