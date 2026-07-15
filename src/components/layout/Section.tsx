import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

export function Section({
  children,
  className,
  id,
  as: Tag = "section",
  container = true,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: "section" | "div";
  container?: boolean;
}) {
  return (
    <Tag id={id} className={cn("section-py", className)}>
      {container ? <Container>{children}</Container> : children}
    </Tag>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  align = "center",
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  align?: "center" | "start";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center"
          ? "items-center text-center"
          : "items-start text-start",
      )}
    >
      {eyebrow && (
        <span className="text-[13px] font-semibold text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-2xl text-sm text-paragraph md:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}
