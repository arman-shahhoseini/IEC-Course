import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/Section";
import { teachers } from "@/data/teachers";
import { stagger, fadeUp, viewportOnce } from "@/lib/motion";

export function TeachersSection() {
  return (
    <Section>
      <SectionHeader
        title="مدرسان مرکز"
        subtitle="اساتید و متخصصان آموزش‌دهنده دوره‌های مرکز"
      />

      {teachers.length > 0 ? (
        <motion.div
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {teachers.map((teacher) => (
            <motion.div
              key={teacher.name}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group rounded-[24px] border border-border bg-white p-6 text-center shadow-card transition-shadow duration-500 hover:shadow-card-hover"
            >
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/[0.06] text-primary">
                <Users className="size-8" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-foreground">
                {teacher.name}
              </h3>
              <p className="mt-1 text-[12.5px] text-paragraph">
                {teacher.expertise}
              </p>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-10 rounded-[24px] border border-dashed border-border bg-surface p-12 text-center"
        >
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/[0.06] text-primary">
            <Users className="size-8" strokeWidth={1.75} />
          </div>
          <h3 className="mt-5 text-[18px] font-bold text-foreground">
            به‌زودی مدرسان مرکز معرفی می‌شوند
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-paragraph">
            مدرسان مرکز کارآفرینی بین‌المللی دانشگاه شمال از متخصصان مجرب در
            صنعت و دانشگاه هستند. اطلاعات آن‌ها به‌زودی در این بخش ارائه می‌شود.
          </p>
        </motion.div>
      )}
    </Section>
  );
}
