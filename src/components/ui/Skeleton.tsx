import { cn } from "@/lib/cn";

/** Loading placeholder block; size it with width/height utilities. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
    />
  );
}
