import type { Teacher, Testimonial, CourseCategory } from "@/types";
import {
  Code,
  Calculator,
  Settings,
  TrendingUp,
  Cpu,
  HeartPulse,
  Building2,
} from "lucide-react";
import { archivedCourses } from "./courses";

/**
 * Teachers — empty for now.
 * Populate with real data when available.
 * Never fabricate names or credentials.
 */
export const teachers: Teacher[] = [];

/**
 * Testimonials — empty for now.
 * Populate with real student feedback when available.
 * Never fabricate quotes or names.
 */
export const testimonials: Testimonial[] = [];

/**
 * Course categories — derived from real archived course data.
 * Automatically calculates count per category.
 */
const categoryIcons: Record<string, typeof Code> = {
  برنامه‌نویسی: Code,
  مالی: Calculator,
  مهندسی: Settings,
  مدیریت: TrendingUp,
  فناوری: Cpu,
  سلامت: HeartPulse,
};

const categoryNames: Record<string, string> = {
  برنامه‌نویسی: "برنامه‌نویسی",
  مالی: "مالی و حسابداری",
  مهندسی: "مهندسی",
  مدیریت: "مدیریت",
  فناوری: "فناوری",
  سلامت: "سلامت",
};

export const courseCategories: CourseCategory[] = Object.entries(
  archivedCourses.reduce(
    (acc, c) => {
      if (c.category) {
        acc[c.category] = (acc[c.category] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  ),
)
  .map(([cat, count]) => ({
    slug: cat,
    name: categoryNames[cat] || cat,
    icon: categoryIcons[cat] || Building2,
    count,
  }))
  .sort((a, b) => b.count - a.count);
