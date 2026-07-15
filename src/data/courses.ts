import type { Course } from "@/types";

/**
 * Helper to build self-hosted image paths.
 * Both .webp and .jpg variants exist in /public/images/courses/.
 */
function courseImage(slug: string) {
  return {
    webp: `/images/courses/${slug}.webp`,
    jpg: `/images/courses/${slug}.jpg`,
  };
}

/**
 * Course catalog.
 *
 * Three statuses:
 * - `upcoming`: Future courses (empty for now — will be added when available)
 * - `current`: Active courses open for registration (empty for now)
 * - `archived`: Past courses — historical educational activities
 *
 * The UI automatically renders sections based on which arrays have data.
 * When upcoming/current courses become available, add them to the respective
 * arrays and the homepage will automatically show those sections ABOVE
 * the archived section.
 *
 * Data policy:
 * - `title` and `cover` are real (sourced from the center's official website).
 * - `category` is inferred from the course subject for organizational purposes.
 * - All other fields are intentionally OMITTED because real data is not available.
 * - Never fabricate values.
 */

export const upcomingCourses: Course[] = [];
export const currentCourses: Course[] = [];

export const archivedCourses: Course[] = [
  {
    slug: "aimsun",
    title: "دوره آموزشی نرم افزار AIMSUN",
    category: "مهندسی",
    status: "archived",
    cover: courseImage("aimsun"),
  },
  {
    slug: "python",
    title: "دوره صفر تا صد پایتون",
    category: "برنامه‌نویسی",
    status: "archived",
    cover: courseImage("python"),
  },
  {
    slug: "massage",
    title: "دوره کاربر ماساژ (ویژه آقایان)",
    category: "سلامت",
    status: "archived",
    cover: courseImage("massage"),
  },
  {
    slug: "3d-printing",
    title: "دوره آموزشی کار با پرینتر سه بعدی",
    category: "فناوری",
    status: "archived",
    cover: courseImage("3d-printing"),
  },
  {
    slug: "accounting",
    title: "دوره کاربردی حسابداری",
    category: "مالی",
    status: "archived",
    cover: courseImage("accounting"),
  },
  {
    slug: "instruments",
    title: "دوره آشنایی با تجهیزات ابزار دقیق",
    category: "مهندسی",
    status: "archived",
    cover: courseImage("instruments"),
  },
  {
    slug: "financial-trading",
    title: "دوره معامله گری بازارهای مالی",
    category: "مالی",
    status: "archived",
    cover: courseImage("financial-trading"),
  },
  {
    slug: "accounting-basics",
    title: "دوره کاربردی حسابداری پایه",
    category: "مالی",
    status: "archived",
    cover: courseImage("accounting-basics"),
  },
  {
    slug: "creativity-robotics",
    title: "دوره آموزشی خلاقیت و رباتیک",
    category: "فناوری",
    status: "archived",
    cover: courseImage("creativity-robotics"),
  },
  {
    slug: "python-creative-beginner",
    title:
      "دوره آموزشی حل مسئله خلاقیت الگوریتمی و برنامه نویسی پایتون سطح مقدماتی",
    category: "برنامه‌نویسی",
    status: "archived",
    cover: courseImage("python-creative-beginner"),
  },
  {
    slug: "python-creative-intermediate",
    title:
      "دوره آموزشی حل مسئله خلاقیت الگوریتمی و برنامه نویسی پایتون سطح متوسط",
    category: "برنامه‌نویسی",
    status: "archived",
    cover: courseImage("python-creative-intermediate"),
  },
  {
    slug: "frontend-programming",
    title: "دوره آموزشی جامع برنامه نویسی فرانت اند",
    category: "برنامه‌نویسی",
    status: "archived",
    cover: courseImage("frontend-programming"),
  },
  {
    slug: "management-skills",
    title: "دوره جامع مهارت های مدیریتی",
    category: "مدیریت",
    status: "archived",
    cover: courseImage("management-skills"),
  },
  {
    slug: "sales-drivers",
    title: "دوره پیشران های طلایی فروش",
    category: "مدیریت",
    status: "archived",
    cover: courseImage("sales-drivers"),
  },
];

/** All courses combined (for backward compatibility). */
export const courses: Course[] = [
  ...upcomingCourses,
  ...currentCourses,
  ...archivedCourses,
];

/** Get a course by slug. */
export const getCourse = (slug: string) => courses.find((c) => c.slug === slug);

/** Number of unique educational domains covered by archived courses. */
export const courseCategories = [
  ...new Set(archivedCourses.map((c) => c.category).filter(Boolean)),
] as string[];
