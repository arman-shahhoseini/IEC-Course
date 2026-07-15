import type { LucideIcon } from "lucide-react";

export type Level = "مقدماتی" | "متوسط" | "پیشرفته";

export interface CurriculumItem {
  title: string;
  lessons: string[];
}

export interface CourseFaq {
  q: string;
  a: string;
}

/** Self-hosted image with WebP + JPEG fallback. */
export interface CourseImage {
  webp: string;
  jpg: string;
}

export type CourseStatus = "upcoming" | "current" | "archived";

export interface Course {
  slug: string;
  title: string;
  status: CourseStatus;
  cover: CourseImage;
  category?: string;
  date?: string;
  year?: string;
  summary?: string;
  description?: string;
  durationHours?: number;
  level?: Level;
  instructor?: string;
  outcomes?: string[];
  curriculum?: CurriculumItem[];
  faqs?: CourseFaq[];
  startDate?: string;
  registrationUrl?: string;
}

export interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface NavItem {
  label: string;
  to: string;
}

export interface Teacher {
  name: string;
  expertise: string;
  avatar?: CourseImage;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar?: CourseImage;
}

export interface CourseCategory {
  slug: string;
  name: string;
  icon: LucideIcon;
  count: number;
}
