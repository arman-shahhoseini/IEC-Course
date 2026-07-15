/**
 * HowItWorks — explains the platform flow for students and instructors.
 */
import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { stagger, viewportOnce, fadeUp } from "@/lib/motion";
import {
  UserPlus,
  Search,
  CreditCard,
  GraduationCap,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";

const studentSteps = [
  { icon: UserPlus, title: "ثبت‌نام", desc: "با شماره موبایل وارد شوید" },
  {
    icon: Search,
    title: "انتخاب دوره",
    desc: "از میان دوره‌های موجود انتخاب کنید",
  },
  {
    icon: CreditCard,
    title: "ثبت‌نام و پرداخت",
    desc: "فیش واریزی را آپلود کنید",
  },
  { icon: GraduationCap, title: "شروع یادگیری", desc: "در دوره شرکت کنید" },
];

const instructorSteps = [
  {
    icon: FileText,
    title: "ارسال درخواست",
    desc: "فرم درخواست تدریس را پر کنید",
  },
  {
    icon: Users,
    title: "بررسی و تایید",
    desc: "تیم پشتیبانی درخواست را بررسی می‌کند",
  },
  {
    icon: BarChart3,
    title: "ساخت دوره",
    desc: "دوره خود را ایجاد و مدیریت کنید",
  },
  {
    icon: CreditCard,
    title: "درآمد",
    desc: "کمیسیون خود را در کیف‌پول دریافت کنید",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 gradient-mesh"
      />
      <Container className="relative">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-[12px] font-semibold text-primary backdrop-blur-xl">
            چگونه کار می‌کند
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
            مسیر یادگیری ساده است
          </h2>
          <p className="mt-3 text-[15px] leading-8 text-paragraph">
            در چند مرحله ساده شروع کنید — چه دانشجو باشید چه مدرس
          </p>
        </Reveal>

        {/* Student journey */}
        <Reveal className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-foreground">مسیر دانشجو</h3>
          </div>
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {studentSteps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative">
                <div className="rounded-[20px] border border-border bg-white p-6 shadow-card card-premium">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/[0.06] text-primary">
                      <step.icon className="size-5" strokeWidth={1.8} />
                    </div>
                    <span className="text-2xl font-extrabold text-border">
                      {(i + 1).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <h4 className="mt-4 text-[15px] font-bold text-foreground">
                    {step.title}
                  </h4>
                  <p className="mt-1 text-[13px] leading-6 text-paragraph">
                    {step.desc}
                  </p>
                </div>
                {i < studentSteps.length - 1 && (
                  <div className="absolute -end-2 top-1/2 hidden -translate-y-1/2 text-border lg:block">
                    ←
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* Instructor journey */}
        <Reveal>
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold">
              <Users className="size-5" />
            </div>
            <h3 className="text-xl font-bold text-foreground">مسیر مدرس</h3>
          </div>
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {instructorSteps.map((step, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className="rounded-[20px] border border-border bg-white p-6 shadow-card card-premium">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-gold/[0.06] text-gold">
                      <step.icon className="size-5" strokeWidth={1.8} />
                    </div>
                    <span className="text-2xl font-extrabold text-border">
                      {(i + 1).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <h4 className="mt-4 text-[15px] font-bold text-foreground">
                    {step.title}
                  </h4>
                  <p className="mt-1 text-[13px] leading-6 text-paragraph">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>
      </Container>
    </section>
  );
}
