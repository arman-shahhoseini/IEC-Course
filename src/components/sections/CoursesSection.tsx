import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Plus, Search, X, ArrowUpDown } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/Section";
import { CourseCard } from "@/components/cards/CourseCard";
import {
  upcomingCourses,
  currentCourses,
  archivedCourses,
} from "@/data/courses";
import { courseCategories } from "@/data/teachers";
import { stagger, viewportOnce, fadeUp } from "@/lib/motion";

const INITIAL_DISPLAY = 6;
const LOAD_MORE_COUNT = 6;

type SortOption = "newest" | "oldest" | "alphabetical";

export function CoursesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(INITIAL_DISPLAY);

  const hasUpcoming = upcomingCourses.length > 0;
  const hasCurrent = currentCourses.length > 0;
  const hasArchived = archivedCourses.length > 0;

  // Filter + sort archived courses
  const filteredArchived = useMemo(() => {
    let result = archivedCourses.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || c.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "alphabetical") {
        return a.title.localeCompare(b.title, "fa");
      }
      if (sortBy === "oldest") {
        return (a.year || "").localeCompare(b.year || "");
      }
      // newest (default)
      return (b.year || "").localeCompare(a.year || "");
    });

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  const visibleArchived = filteredArchived.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArchived.length;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSortBy("newest");
    setVisibleCount(INITIAL_DISPLAY);
  };

  return (
    <Section>
      {/* Upcoming Courses — highest priority */}
      {hasUpcoming && (
        <div className="mb-16">
          <SectionHeader
            title="دوره‌های پیش‌رو"
            subtitle="دوره‌هایی که در آینده نزدیک برگزار می‌شوند"
            align="start"
          />
          <motion.div
            variants={stagger(0.07)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {upcomingCourses.map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </motion.div>
        </div>
      )}

      {/* Current Courses — second priority */}
      {hasCurrent && (
        <div className="mb-16">
          <SectionHeader
            title="دوره‌های در حال برگزاری"
            subtitle="ثبت‌نام باز است — هم‌اکنون ثبت‌نام کنید"
            align="start"
          />
          <motion.div
            variants={stagger(0.07)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {currentCourses.map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </motion.div>
        </div>
      )}

      {/* Archived Courses — with search + filter + sort + Load More */}
      {hasArchived && (
        <div>
          <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <SectionHeader
              title="دوره‌های برگزار شده"
              subtitle="آرشیو دوره‌های آموزشی — بیش از ۶۵ دوره"
              align="start"
            />
            <Link
              to="/courses"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-white px-4 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              مشاهده همه
              <ChevronLeft className="size-3.5" />
            </Link>
          </div>

          {/* Search + Category Filter + Sort */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-paragraph" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(INITIAL_DISPLAY);
                }}
                placeholder="جستجوی دوره..."
                aria-label="جستجوی دوره"
                className="w-full rounded-[18px] border border-border bg-white py-3 ps-11 pe-4 text-[14px] text-foreground outline-none transition-colors placeholder:text-paragraph focus:border-primary/40"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setVisibleCount(INITIAL_DISPLAY);
                  }}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-paragraph hover:text-foreground"
                  aria-label="پاک کردن جستجو"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-paragraph" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="مرتب‌سازی"
                className="cursor-pointer appearance-none rounded-[18px] border border-border bg-white py-3 ps-10 pe-8 text-[13px] font-medium text-foreground outline-none transition-colors hover:border-primary/40 focus:border-primary/40"
              >
                <option value="newest">جدیدترین</option>
                <option value="oldest">قدیمی‌ترین</option>
                <option value="alphabetical">الفبایی</option>
              </select>
            </div>
          </div>

          {/* Category pills */}
          <div className="mb-8 flex flex-wrap gap-2">
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
                {cat.name} ({cat.count.toLocaleString("fa-IR")})
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="mb-6 text-[13px] text-paragraph">
            {filteredArchived.length.toLocaleString("fa-IR")} دوره یافت شد
          </p>

          {/* Course grid */}
          {visibleArchived.length > 0 ? (
            <motion.div
              variants={stagger(0.06)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {visibleArchived.map((c) => (
                <CourseCard key={c.slug} course={c} />
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-surface p-12 text-center">
              <p className="text-[14px] font-semibold text-foreground">
                دوره‌ای با این مشخصات یافت نشد
              </p>
              <button
                onClick={resetFilters}
                className="mt-3 text-[12px] font-semibold text-primary hover:underline"
              >
                پاک کردن فیلترها
              </button>
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
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
                <span className="text-[12px] text-paragraph">
                  (
                  {(filteredArchived.length - visibleCount).toLocaleString(
                    "fa-IR",
                  )}{" "}
                  دوره)
                </span>
              </motion.button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
