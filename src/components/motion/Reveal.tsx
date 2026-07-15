import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?:
    | "div"
    | "section"
    | "article"
    | "header"
    | "ul"
    | "li"
    | "h1"
    | "h2"
    | "h3"
    | "p";
}

/**
 * Reveal — animates children into view with a fade-up effect when they
 * enter the viewport.
 *
 * Implementation: pure CSS animation with IntersectionObserver trigger.
 * No framer-motion dependency (which was causing "text disappears" bugs
 * because its `initial="hidden"` renders opacity:0 in SSR HTML).
 *
 * How it works:
 *   1. Content starts visible (opacity:1) in SSR HTML — no flash of
 *      invisible text on slow connections.
 *   2. On mount, we check if the element is already in view. If so,
 *      we skip the animation entirely (content stays visible).
 *   3. If the element is below the fold, we apply the `reveal-hidden`
 *      class (opacity:0) and then trigger the animation via
 *      IntersectionObserver when it enters the viewport.
 *   4. If IntersectionObserver isn't supported or doesn't fire, a
 *      1-second fallback timer forces the visible state.
 *   5. prefers-reduced-motion: skip the hidden state entirely.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: RevealProps) {
  const [visible, setVisible] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setVisible(true);
      setShouldAnimate(false);
      return;
    }

    // We'll use IntersectionObserver to decide whether to animate.
    // For now, mark that we CAN animate (initial render is visible).
    setShouldAnimate(true);
  }, []);

  const Tag = as as "div";
  const animationDelay = delay > 0 ? `${delay}ms` : undefined;

  // If we can animate, use the reveal-hidden + reveal-visible pattern.
  // Otherwise, just render the content plainly.
  if (shouldAnimate) {
    return (
      <Tag
        className={cn(className)}
        style={{ animationDelay }}
        ref={(el: HTMLDivElement | null) => {
          if (!el) return;
          if (typeof IntersectionObserver === "undefined") return;
          // Start hidden only if below the fold.
          const rect = el.getBoundingClientRect();
          const isInView = rect.top < window.innerHeight && rect.bottom > 0;
          if (!isInView) {
            el.classList.add("reveal-hidden");
            const observer = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (entry.isIntersecting) {
                    el.classList.remove("reveal-hidden");
                    el.classList.add("reveal-visible");
                    observer.disconnect();
                  }
                }
              },
              { rootMargin: "-80px" },
            );
            observer.observe(el);
            // Fallback: if observer doesn't fire in 1.5s, force visible.
            setTimeout(() => {
              el.classList.remove("reveal-hidden");
              el.classList.add("reveal-visible");
            }, 1500);
          } else {
            // Already in view — no animation needed, content is visible.
          }
        }}
      >
        {children}
      </Tag>
    );
  }

  return <Tag className={cn(className)}>{children}</Tag>;
}
