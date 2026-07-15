/**
 * PlatformCapabilities — showcases the platform features.
 */
import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { stagger, viewportOnce, fadeUp } from "@/lib/motion";
import {
  ShieldCheck,
  Wallet,
  Ticket,
  BarChart3,
  Bell,
  Search,
  GraduationCap,
  CreditCard,
  FileText,
  Users,
  BookOpen,
  ScrollText,
} from "lucide-react";

const capabilities = [
  {
    icon: ShieldCheck,
    title: "احراز هویت امن",
    desc: "ورود با شماره موبایل و کد یک‌بار مصرف",
  },
  {
    icon: BookOpen,
    title: "مدیریت دوره‌ها",
    desc: "ساخت، ویرایش و انتشار دوره توسط مدرسان",
  },
  {
    icon: CreditCard,
    title: "پرداخت دستی",
    desc: "آپلود فیش واریزی و تایید توسط پشتیبان",
  },
  { icon: Wallet, title: "کیف‌پول مدرس", desc: "تسویه خودکار با کسر کمیسیون" },
  {
    icon: Ticket,
    title: "سیستم تیکت",
    desc: "پشتیبانی و پاسخگویی به سوالات کاربران",
  },
  {
    icon: GraduationCap,
    title: "درخواست تدریس",
    desc: "فرم درخواست و فرآیند تایید مدرس",
  },
  {
    icon: BarChart3,
    title: "داشبورد آماری",
    desc: "آمار کاربران، دوره‌ها و درآمد",
  },
  {
    icon: ScrollText,
    title: "گزارش فعالیت",
    desc: "ثبت تمام عملیات‌های مهم سیستم",
  },
  { icon: Users, title: "مدیریت نقش‌ها", desc: "دانشجو، مدرس، پشتیبان و مدیر" },
  { icon: Bell, title: "اعلان‌ها", desc: "سیستم اعلان و پیام درون‌برنامه‌ای" },
  { icon: Search, title: "جستجو", desc: "جستجوی دوره‌ها و محتوا" },
  {
    icon: FileText,
    title: "صف بررسی",
    desc: "صف تایید درخواست‌ها و پرداخت‌ها",
  },
];

export function PlatformCapabilities() {
  return (
    <section className="bg-surface py-20 md:py-28">
      <Container>
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-[12px] font-semibold text-primary backdrop-blur-xl">
            امکانات پلتفرم
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
            همه چیز در یک پلتفرم
          </h2>
          <p className="mt-3 text-[15px] leading-8 text-paragraph">
            از احراز هویت تا مدیریت دوره، پرداخت و گزارش‌گیری
          </p>
        </Reveal>

        <motion.div
          variants={stagger(0.05)}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {capabilities.map((cap, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group flex flex-col items-center rounded-[20px] border border-border bg-white p-5 text-center shadow-card card-premium"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/[0.06] text-primary transition-all duration-500 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
                <cap.icon className="size-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-3 text-[14px] font-bold text-foreground">
                {cap.title}
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-paragraph">
                {cap.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
