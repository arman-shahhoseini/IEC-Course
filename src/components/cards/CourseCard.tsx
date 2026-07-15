import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Clock, ArrowLeft } from "lucide-react";
import type { Course } from "@/types";
import { fadeUp } from "@/lib/motion";

/**
 * CourseCard — display card supporting three statuses with distinct visual emphasis.
 *
 * Visual hierarchy:
 * - `current`: Highest emphasis — primary border, pulse indicator, registration CTA
 * - `upcoming`: Medium emphasis — gold accent, dashed border, "coming soon"
 * - `archived`: Lower emphasis — subtle, muted badge, no interaction
 *
 * Uses <picture> with WebP + JPEG fallback for optimal performance.
 */
export function CourseCard({ course }: { course: Course }) {
  if (course.status === "current") return <CurrentCard course={course} />;
  if (course.status === "upcoming") return <UpcomingCard course={course} />;
  return <ArchivedCard course={course} />;
}

function ArchivedCard({ course }: { course: Course }) {
  return (
    <motion.article
      variants={fadeUp}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-border bg-white shadow-card card-premium"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <picture>
          <source srcSet={course.cover.webp} type="image/webp" />
          <img
            src={course.cover.jpg}
            alt={`پوستر ${course.title}`}
            loading="lazy"
            width={800}
            height={1000}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </picture>
        {/* Subtle archive badge — lower visual emphasis */}
        <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-md bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-paragraph shadow-sm backdrop-blur-sm">
          <CheckCircle2 className="size-3" strokeWidth={2} />
          برگزار شده
        </span>
        {course.category && (
          <span className="absolute top-3 end-3 rounded-md bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-paragraph shadow-sm backdrop-blur">
            {course.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[14px] font-bold leading-6 text-foreground">
          {course.title}
        </h3>
        <span className="mt-3 inline-flex w-full items-center justify-center rounded-[12px] bg-surface px-3 py-2 text-[12px] font-medium text-paragraph">
          دوره آرشیوی
        </span>
      </div>
    </motion.article>
  );
}

function CurrentCard({ course }: { course: Course }) {
  return (
    <motion.article
      variants={fadeUp}
      className="group flex flex-col overflow-hidden rounded-[24px] border-2 border-primary/20 bg-white shadow-card card-premium hover:border-primary/40"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <picture>
          <source srcSet={course.cover.webp} type="image/webp" />
          <img
            src={course.cover.jpg}
            alt={`پوستر ${course.title}`}
            loading="lazy"
            width={800}
            height={1000}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </picture>
        {/* High-emphasis badge — primary color, pulse indicator */}
        <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-md">
          <span className="size-1.5 animate-pulse rounded-full bg-white" />
          ثبت‌نام باز
        </span>
        {course.category && (
          <span className="absolute top-3 end-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-foreground shadow-sm backdrop-blur">
            {course.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-7 text-foreground">
          {course.title}
        </h3>
        {course.summary && (
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-6 text-paragraph">
            {course.summary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-paragraph">
          {course.durationHours && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={2} />
              {course.durationHours} ساعت
            </span>
          )}
          {course.level && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" strokeWidth={2} />
              {course.level}
            </span>
          )}
        </div>
        {course.registrationUrl ? (
          <a
            href={course.registrationUrl}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-primary-hover"
          >
            ثبت‌نام در دوره
            <ArrowLeft className="size-4" />
          </a>
        ) : (
          <span className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white">
            ثبت‌نام در دوره
          </span>
        )}
      </div>
    </motion.article>
  );
}

function UpcomingCard({ course }: { course: Course }) {
  return (
    <motion.article
      variants={fadeUp}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-dashed border-gold/40 bg-white shadow-card card-premium"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <picture>
          <source srcSet={course.cover.webp} type="image/webp" />
          <img
            src={course.cover.jpg}
            alt={`پوستر ${course.title}`}
            loading="lazy"
            width={800}
            height={1000}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </picture>
        {/* Medium-emphasis badge — gold accent */}
        <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[11px] font-bold text-white shadow-md">
          <Calendar className="size-3" strokeWidth={2.2} />
          به‌زودی
        </span>
        {course.category && (
          <span className="absolute top-3 end-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-foreground shadow-sm backdrop-blur">
            {course.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-7 text-foreground">
          {course.title}
        </h3>
        {course.startDate && (
          <p className="mt-2 text-[12.5px] text-paragraph">
            شروع دوره: {course.startDate}
          </p>
        )}
        <span className="mt-3 inline-flex w-full items-center justify-center rounded-[14px] border border-gold/30 bg-gold/[0.05] px-4 py-2.5 text-[13px] font-semibold text-gold">
          به‌زودی اعلام می‌شود
        </span>
      </div>
    </motion.article>
  );
}
