/**
 * Avatar — image-with-fallback component built on
 * @radix-ui/react-avatar.
 *
 * Falls back to initials when the image fails to load. Used in:
 *   - DashboardShell sidebar footer (current user)
 *   - Topbar user menu
 *   - Course detail page (instructor avatar — Stage 5)
 *   - Support ticket threads (Stage 6)
 *
 * The `name` prop is required so initials are always available as a
 * fallback — never pass an avatar without also passing a name.
 */
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full bg-surface text-foreground",
  {
    variants: {
      size: {
        sm: "size-8 text-xs",
        default: "size-10 text-sm",
        lg: "size-12 text-base",
        xl: "size-16 text-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface AvatarProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  ),
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square size-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "grid size-full place-items-center font-semibold text-paragraph",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/** Convenience helper: extract up to 2 Persian/Latin initials from a name. */
function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "؟";
  // Split on whitespace and take first letter of the first two words.
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0)).join("");
}

export interface NamedAvatarProps extends AvatarProps {
  /** Display name — used for the initials fallback. */
  name: string;
  /** Optional image URL. */
  src?: string;
  /** Optional alt text (defaults to the name). */
  alt?: string;
}

/**
 * Convenience wrapper: pass `name` + optional `src` and the component
 * handles image-with-initials-fallback automatically.
 */
const NamedAvatar = React.forwardRef<HTMLSpanElement, NamedAvatarProps>(
  ({ name, src, alt, className, size, ...props }, ref) => (
    <Avatar ref={ref} size={size} className={className} {...props}>
      {src && <AvatarImage src={src} alt={alt ?? name} />}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  ),
);
NamedAvatar.displayName = "NamedAvatar";

export { Avatar, AvatarImage, AvatarFallback, NamedAvatar, initialsOf };
