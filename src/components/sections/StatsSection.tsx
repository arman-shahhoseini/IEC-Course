import { motion } from "framer-motion";
import { BookOpen, Users, Clock, Award } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Counter } from "@/components/motion/Counter";
import { stagger, fadeUp, viewportOnce } from "@/lib/motion";

/**
 * Education-focused statistics.
 * All numbers are real and verifiable:
 * - ۶۵: total courses held (per official center data)
 * - ۶: unique educational domains
 * - ۱۴۰۱: founding year
 * - ۱: official university certificate per course
 */
const stats = [
  { icon: BookOpen, value: 65, suffix: "+", label: "دوره آموزشی برگزار شده" },
  { icon: Award, value: 6, suffix: "", label: "حوزه آموزشی متنوع" },
  { icon: Clock, value: 1401, suffix: "", label: "سال شروع فعالیت" },
  { icon: Users, value: 1, suffix: "", label: "گواهی رسمی دانشگاه شمال" },
];

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-primary py-16 text-white md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(600px circle at 20% 30%, #ffffff, transparent 40%), radial-gradient(600px circle at 80% 70%, #ffffff, transparent 40%)",
        }}
      />
      <Container>
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="relative grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="flex items-center justify-center gap-4 md:gap-6"
              >
                <div className="grid size-14 place-items-center rounded-2xl bg-white/15 backdrop-blur md:size-16">
                  <Icon className="size-7 md:size-8" strokeWidth={1.9} />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-extrabold md:text-5xl">
                    <Counter to={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-[12px] opacity-90 md:text-[14px]">
                    {s.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </section>
  );
}
