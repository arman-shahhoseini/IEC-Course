/**
 * /courses/$slug — public course detail page.
 *
 * Public (no auth required for viewing). Shows full course info +
 * a "ثبت‌نام در این دوره" button that:
 *   - If user is logged in → /dashboard/enroll/{courseId}
 *   - If not logged in → /dashboard?redirectTo=/dashboard/enroll/{courseId}
 *
 * If the slug is not found OR the course is not `published`, render the
 * project's standard 404 (via `throw notFound()`).
 *
 * Auth context is read from `Route.useRouteContext()` — the root
 * `beforeLoad` already injected `auth` from the session cookie on the
 * server side, so the enroll button's href is correct in SSR HTML.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  Users,
  Tag,
  GraduationCap,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { site } from "@/data/site";
import { breadcrumb, jsonLdScript } from "@/lib/seo";
import { getPublicCourseBySlug } from "@/server/auth/public-courses.functions";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `دوره | ${site.shortName}` },
      {
        name: "description",
        content: `جزئیات دوره‌ی آموزشی مرکز کارآفرینی بین‌المللی دانشگاه شمال.`,
      },
    ],
    links: [{ rel: "canonical", href: `/courses/${params.slug}` }],
    scripts: [
      jsonLdScript(
        breadcrumb([
          { name: "صفحه اصلی", item: "/" },
          { name: "دوره‌ها", item: "/courses" },
        ]),
      ),
    ],
  }),
  loader: async ({
    params,
  }): Promise<{
    course: NonNullable<Awaited<ReturnType<typeof getPublicCourseBySlug>>>;
  }> => {
    const course = await getPublicCourseBySlug({ data: { slug: params.slug } });
    if (!course) {
      // Triggers the root route's `notFoundComponent` — standard 404.
      throw notFound();
    }
    return { course };
  },
  component: CourseDetailPage,
});

function CourseDetailPage() {
  // The loader throws `notFound()` if the course doesn't exist, so by
  // the time the component renders, `course` is guaranteed non-null.
  // The type assertion helps TS understand this (TanStack's loader
  // type inference doesn't narrow through `throw`).
  const loaderData = Route.useLoaderData() as {
    course: NonNullable<Awaited<ReturnType<typeof getPublicCourseBySlug>>>;
  };
  const course = loaderData.course;
  const { auth } = Route.useRouteContext();

  // Build the enroll button's destination.
  // - Logged in → /dashboard/enroll/{courseId}
  // - Not logged in → /dashboard?redirectTo=/dashboard/enroll/{courseId}
  const enrollHref = auth
    ? `/dashboard/enroll/${course.id}`
    : `/dashboard?redirectTo=${encodeURIComponent(`/dashboard/enroll/${course.id}`)}`;

  const priceDisplay =
    course.price !== null && course.price > 0
      ? `${course.price.toLocaleString("fa-IR")} تومان`
      : "رایگان";

  return (
    <>
      <Navbar />
      <main id="main" className="pt-28 md:pt-32 pb-16">
        <Container>
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-paragraph">
            <Link to="/" className="hover:text-primary">
              صفحه اصلی
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/courses" className="hover:text-primary">
              دوره‌ها
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{course.title}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Main content */}
            <div className="space-y-8">
              {/* Cover + title */}
              <Reveal>
                <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-white shadow-card">
                  <picture>
                    <source srcSet={course.cover.webp} type="image/webp" />
                    <img
                      src={course.cover.jpg}
                      alt={`پوستر ${course.title}`}
                      className="aspect-[16/9] w-full object-cover"
                      loading="eager"
                    />
                  </picture>
                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      {course.category && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-paragraph">
                          <Tag className="size-3" />
                          {course.category}
                        </span>
                      )}
                      {course.level && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-paragraph">
                          <GraduationCap className="size-3" />
                          {course.level}
                        </span>
                      )}
                      <StatusBadge
                        status={
                          course.status === "current"
                            ? "success"
                            : course.status === "upcoming"
                              ? "pending"
                              : "draft"
                        }
                        label={
                          course.status === "current"
                            ? "در حال برگزاری"
                            : course.status === "upcoming"
                              ? "به‌زودی"
                              : "برگزار شده"
                        }
                      />
                    </div>
                    <h1 className="mt-4 text-2xl font-extrabold text-foreground md:text-3xl">
                      {course.title}
                    </h1>
                    {course.summary && (
                      <p className="mt-3 text-sm leading-7 text-paragraph">
                        {course.summary}
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>

              {/* Description */}
              {course.description && (
                <Reveal>
                  <section className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
                    <h2 className="mb-4 text-lg font-bold text-foreground">
                      توضیحات دوره
                    </h2>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {course.description}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* Syllabus */}
              {course.syllabus && (
                <Reveal>
                  <section className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
                    <h2 className="mb-4 text-lg font-bold text-foreground">
                      سرفصل‌های دوره
                    </h2>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {course.syllabus}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* Prerequisites */}
              {course.prerequisites && (
                <Reveal>
                  <section className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
                    <h2 className="mb-4 text-lg font-bold text-foreground">
                      پیش‌نیازها
                    </h2>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {course.prerequisites}
                    </div>
                  </section>
                </Reveal>
              )}

              {/* Instructor */}
              {course.instructorName && (
                <Reveal>
                  <section className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
                    <h2 className="mb-4 text-lg font-bold text-foreground">
                      مدرس دوره
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="grid size-14 place-items-center rounded-full bg-surface">
                        <GraduationCap className="size-7 text-paragraph" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          {course.instructorName}
                        </p>
                        {course.source === "platform" && (
                          <p className="text-xs text-paragraph">
                            مدرس ثبت‌شده در سیستم
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                </Reveal>
              )}
            </div>

            {/* Sidebar — enrollment card */}
            <aside>
              <div className="sticky top-24 rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card">
                {/* Price */}
                <div className="mb-4">
                  <p className="text-xs text-paragraph">هزینه‌ی دوره</p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">
                    {priceDisplay}
                  </p>
                </div>

                {/* Quick info */}
                <dl className="space-y-3 border-t border-border pt-4 text-sm">
                  {course.durationSessions !== null && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-paragraph">
                        <Clock className="size-4" />
                        تعداد جلسات
                      </dt>
                      <dd className="font-semibold text-foreground">
                        {course.durationSessions.toLocaleString("fa-IR")} جلسه
                      </dd>
                    </div>
                  )}
                  {course.capacity !== null && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-paragraph">
                        <Users className="size-4" />
                        ظرفیت
                      </dt>
                      <dd className="font-semibold text-foreground">
                        {course.capacity.toLocaleString("fa-IR")} نفر
                      </dd>
                    </div>
                  )}
                  {course.level && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-paragraph">
                        <GraduationCap className="size-4" />
                        سطح
                      </dt>
                      <dd className="font-semibold text-foreground">
                        {course.level}
                      </dd>
                    </div>
                  )}
                  {course.startDate && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-paragraph">
                        <Calendar className="size-4" />
                        شروع
                      </dt>
                      <dd
                        dir="ltr"
                        className="text-right font-semibold text-foreground"
                      >
                        {course.startDate}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Enroll button */}
                <div className="mt-6 border-t border-border pt-4">
                  {course.status === "archived" ? (
                    <div className="rounded-[var(--radius-md)] bg-surface p-4 text-center">
                      <CheckCircle2 className="mx-auto mb-2 size-6 text-paragraph" />
                      <p className="text-sm font-semibold text-foreground">
                        دوره برگزار شده است
                      </p>
                      <p className="mt-1 text-xs text-paragraph">
                        ثبت‌نام برای این دوره بسته است.
                      </p>
                    </div>
                  ) : course.status === "upcoming" ? (
                    <div className="rounded-[var(--radius-md)] bg-status-pending-bg p-4 text-center">
                      <AlertCircle className="mx-auto mb-2 size-6 text-status-pending" />
                      <p className="text-sm font-semibold text-foreground">
                        به‌زودی اعلام می‌شود
                      </p>
                      <p className="mt-1 text-xs text-paragraph">
                        تاریخ شروع و ثبت‌نام به‌زودی اعلام می‌شود.
                      </p>
                    </div>
                  ) : (
                    <Button asChild variant="default" className="w-full">
                      <Link to={enrollHref as "/dashboard"}>
                        <ArrowLeft className="size-4" />
                        ثبت‌نام در این دوره
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Back link */}
                <div className="mt-4 text-center">
                  <Link
                    to="/courses"
                    className="text-xs text-paragraph hover:text-primary"
                  >
                    بازگشت به فهرست دوره‌ها
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
