import {
  GraduationCap,
  BadgeCheck,
  Monitor,
  Briefcase,
  Clock,
  Award,
  Users,
  Rocket,
  Target,
  BookOpen,
} from "lucide-react";
import type { Feature } from "@/types";

/** Learning benefits — why students choose these courses */
export const features: Feature[] = [
  {
    icon: GraduationCap,
    title: "آموزش پروژه‌محور",
    desc: "یادگیری مهارت‌ها از طریق پروژه‌های واقعی",
  },
  {
    icon: Award,
    title: "مدرسان متخصص",
    desc: "اساتید مجرب و فعال در صنعت",
  },
  {
    icon: BadgeCheck,
    title: "گواهی رسمی",
    desc: "مدرک معتبر پایان دوره دانشگاه شمال",
  },
  {
    icon: Monitor,
    title: "کارگاه عملی",
    desc: "آموزش دست‌به‌آچار در محیط کارگاهی",
  },
  {
    icon: Briefcase,
    title: "آمادگی شغلی",
    desc: "توسعه مهارت‌های مورد نیاز بازار کار",
  },
  {
    icon: Rocket,
    title: "رشد سریع",
    desc: "مسیر یادگیری ساختاریافته و سریع",
  },
];

/** Why choose these courses — trust signals */
export const whyItems: Feature[] = [
  {
    icon: BadgeCheck,
    title: "مدرک دانشگاهی معتبر",
    desc: "گواهی‌نامه پایان دوره با اعتبار رسمی دانشگاه شمال",
  },
  {
    icon: Users,
    title: "مدرسان مجرب",
    desc: "اساتید متخصص با تجربه عملی در صنعت و بازار کار",
  },
  {
    icon: Monitor,
    title: "آموزش کاملاً عملی",
    desc: "یادگیری مهارت‌ها از طریق پروژه‌های واقعی و کارگاهی",
  },
  {
    icon: Target,
    title: "هدف‌گذاری شغلی",
    desc: "هر دوره برای یک مسیر شغلی مشخص طراحی شده است",
  },
];
