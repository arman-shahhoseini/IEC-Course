import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search, X, Plus, Building2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { CourseCard } from "@/components/cards/CourseCard";
import { stagger, viewportOnce, fadeUp } from "@/lib/motion";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/data/site";
import { breadcrumb, jsonLdScript } from "@/lib/seo";
import { getPublicCourses } from "@/server/auth/public-courses.functions";
import type { Course, CourseCategory } from "@/types";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: `دوره‌ها | ${site.shortName}` },
      {
        name: "description",
        content:
          "دوره‌های آموزشی مرکز کارآفرینی بین‌المللی دانشگاه شمال — دوره‌های پیش‌رو، در حال برگزاری و برگزار شده.",
      },
      { property: "og:title", content: `دوره‌ها | ${site.shortName}` },
      {
        property: "og:description",
        content: "دوره‌های آموزشی مرکز کارآفرینی بین‌المللی دانشگاه شمال.",
      },
      { property: "og:url", content: "/courses" },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
    scripts: [
      jsonLdScript(
        breadcrumb([
          { name: "صفحه اصلی", item: "/" },
          { name: "دوره‌ها", item: "/courses" },
        ]),
      ),
    ],
  }),
  // SSR loader — fetches published courses from the DB via a server
  // function. This runs on the server, so the page is fully rendered
  // with real data before reaching the client (no loading flash).
  loader: async () => {
    return getPublicCourses();
  },
  component: CoursesPage,
});

const INITIAL_DISPLAY = 12;
const LOAD_MORE_COUNT = 6;

/**
 * Derive course categories from the loaded courses — same shape as the
 * old static `courseCategories` from `src/data/teachers.ts`.
 *
 * Categories are derived from the `category` field of ALL courses
 * (upcoming + current + archived), sorted by count descending.
 */
function deriveCategories(allCourses: Course[]): CourseCategory[] {
  // Use simple slug = name (no icon mapping needed — the filter buttons
  // just show the name, not the icon).
  const counts = new Map<string, number>();
  for (const c of allCourses) {
    if (c.category) {
      counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ slug: name, name, icon: Building2, count }))
    .sort((a, b) => b.count - a.count);
}

function CoursesPage() {
  // The loader returns the result of `getPublicCourses()` — a server
  // function. TanStack's type inference doesn't always propagate through
  // server functions, so we assert the shape here.
  const data = Route.useLoaderData() as {
    upcoming: Course[];
    current: Course[];
    archived: Course[];
  };
  const upcomingCourses = data.upcoming;
  const currentCourses = data.current;
  const archivedCourses = data.archived;
  const allCourses = [
    ...upcomingCourses,
    ...currentCourses,
    ...archivedCourses,
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_DISPLAY);

  // Derive categories from the loaded data (replaces the static import).
  const courseCategories = deriveCategories(allCourses);

  const hasUpcoming = upcomingCourses.length > 0;
  const hasCurrent = currentCourses.length > 0;
  const hasArchived = archivedCourses.length > 0;

  const filteredArchived = archivedCourses.filter((c) => {
    const matchesSearch =
      !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const visibleArchived = filteredArchived.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArchived.length;

  return (
    <>
      <Navbar />
      <main id="main" className="pt-28 md:pt-32">
        <Container>
          <Reveal className="mb-10 md:mb-14">
            <span className="text-[13px] font-semibold text-primary">
              دوره‌های آموزشی
            </span>
            <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
              دوره‌های مرکز
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-8 text-paragraph">
              مرکز کارآفرینی بین‌المللی دانشگاه شمال بیش از ۶۵ دوره آموزشی
              برگزار کرده است. دوره‌های پیش‌رو، در حال برگزاری و برگزار شده در
              این صفحه قابل مشاهده هستند.
            </p>
          </Reveal>

          {/* Upcoming */}
          {hasUpcoming && (
            <section className="mb-16">
              <h2 className="mb-6 text-2xl font-extrabold">دوره‌های پیش‌رو</h2>
              <motion.div
                variants={stagger(0.06)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {upcomingCourses.map((c) => (
                  <Link
                    key={c.slug}
                    to="/courses/$slug"
                    params={{ slug: c.slug }}
                  >
                    <CourseCard course={c} />
                  </Link>
                ))}
              </motion.div>
            </section>
          )}

          {/* Current */}
          {hasCurrent && (
            <section className="mb-16">
              <h2 className="mb-6 text-2xl font-extrabold">
                دوره‌های در حال برگزاری
              </h2>
              <motion.div
                variants={stagger(0.06)}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {currentCourses.map((c) => (
                  <Link
                    key={c.slug}
                    to="/courses/$slug"
                    params={{ slug: c.slug }}
                  >
                    <CourseCard course={c} />
                  </Link>
                ))}
              </motion.div>
            </section>
          )}

          {/* Archived with Search + Filter */}
          {hasArchived && (
            <section>
              <h2 className="mb-6 text-2xl font-extrabold">
                دوره‌های برگزار شده
              </h2>

              {/* Search + Filter */}
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-paragraph" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(INITIAL_DISPLAY);
                    }}
                    placeholder="جستجوی دوره..."
                    className="w-full rounded-[18px] border border-border bg-white py-3 ps-11 pe-4 text-[14px] text-foreground outline-none transition-colors placeholder:text-paragraph focus:border-primary/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute end-4 top-1/2 -translate-y-1/2 text-paragraph hover:text-foreground"
                      aria-label="پاک کردن جستجو"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setVisibleCount(INITIAL_DISPLAY);
                    }}
                    className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                      !selectedCategory
                        ? "bg-primary text-white"
                        : "border border-border bg-white text-foreground hover:border-primary/40"
                    }`}
                  >
                    همه
                  </button>
                  {courseCategories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setVisibleCount(INITIAL_DISPLAY);
                      }}
                      className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                        selectedCategory === cat.slug
                          ? "bg-primary text-white"
                          : "border border-border bg-white text-foreground hover:border-primary/40"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mb-6 text-[13px] text-paragraph">
                {filteredArchived.length.toLocaleString("fa-IR")} دوره یافت شد
              </p>

              {visibleArchived.length > 0 ? (
                <motion.div
                  variants={stagger(0.06)}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOnce}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {visibleArchived.map((c) => (
                    <Link
                      key={c.slug}
                      to="/courses/$slug"
                      params={{ slug: c.slug }}
                    >
                      <CourseCard course={c} />
                    </Link>
                  ))}
                </motion.div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-border bg-surface p-12 text-center">
                  <p className="text-[14px] font-semibold text-foreground">
                    دوره‌ای با این مشخصات یافت نشد
                  </p>
                  <p className="mt-1 text-[12px] text-paragraph">
                    جستجو یا فیلتر را تغییر دهید
                  </p>
                </div>
              )}

              {hasMore && (
                <div className="mt-10 flex justify-center pb-12">
                  <motion.button
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportOnce}
                    onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
                    className="group inline-flex items-center gap-2 rounded-[18px] border border-border bg-white px-6 py-3 text-[14px] font-semibold text-foreground shadow-card transition-all hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="size-4 transition-transform group-hover:rotate-90" />
                    نمایش دوره‌های بیشتر
                  </motion.button>
                </div>
              )}
            </section>
          )}

          {!hasUpcoming && !hasCurrent && hasArchived && (
            <div className="mb-10 rounded-[20px] border border-gold/30 bg-gold/[0.05] p-5 text-center">
              <p className="text-[14px] font-semibold text-foreground">
                در حال حاضر دوره فعالی برای ثبت‌نام وجود ندارد.
              </p>
              <p className="mt-1 text-[12px] text-paragraph">
                دوره‌های جدید به‌زودی اعلام می‌شوند.
              </p>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
