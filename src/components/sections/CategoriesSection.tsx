import { motion } from "framer-motion";
import { Section, SectionHeader } from "@/components/layout/Section";
import { courseCategories } from "@/data/teachers";
import { stagger, fadeUp, viewportOnce } from "@/lib/motion";

export function CategoriesSection() {
  return (
    <Section className="bg-surface">
      <SectionHeader
        title="حوزه‌های آموزشی"
        subtitle="دوره‌های مرکز در حوزه‌های متنوع مهارتی"
      />
      <motion.div
        variants={stagger(0.06)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        {courseCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.slug}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center rounded-[20px] border border-border bg-white p-5 text-center shadow-card transition-shadow duration-500 hover:shadow-card-hover"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/[0.06] text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white">
                <Icon className="size-6" strokeWidth={1.75} />
              </div>
              <h3 className="mt-3 text-[13px] font-bold text-foreground">
                {cat.name}
              </h3>
              <p className="mt-1 text-[12px] text-paragraph">
                {cat.count.toLocaleString("fa-IR")} دوره
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </Section>
  );
}
