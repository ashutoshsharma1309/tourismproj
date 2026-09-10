import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The one source of button styling. Links that must look like buttons use
 * `buttonClasses()` on a <Link> instead of nesting interactive elements.
 */
export const buttonClasses = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-card",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        outline: "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        "ghost-inverse":
          "border border-foreground-inverse/40 text-foreground-inverse hover:border-foreground-inverse hover:bg-foreground-inverse/10",
        destructive: "bg-error text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-4 text-label",
        md: "h-11 px-5 text-small",
        lg: "h-12 px-7 text-small font-semibold",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonClasses> {
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(buttonClasses({ variant, size }), className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
