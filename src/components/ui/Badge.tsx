import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const badgeClasses = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        jade: "bg-primary-soft text-primary",
        marigold: "bg-accent text-accent-foreground",
        "marigold-soft": "bg-accent-soft text-accent-foreground",
        neutral: "bg-surface-muted text-muted",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        error: "bg-error-soft text-error",
        info: "bg-info-soft text-info",
        inverse: "bg-foreground-inverse/15 text-foreground-inverse",
      },
    },
    defaultVariants: { tone: "jade" },
  },
);

interface BadgeProps extends VariantProps<typeof badgeClasses> {
  children: ReactNode;
  className?: string;
}

export function Badge({ tone, className, children }: BadgeProps) {
  return <span className={cn(badgeClasses({ tone }), className)}>{children}</span>;
}
