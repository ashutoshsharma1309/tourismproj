"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Wider variant for galleries and forms. */
  size?: "md" | "lg";
}

/**
 * Accessible overlay dialog: Escape and backdrop close it, focus moves in on
 * open, body scroll locks while it is up.
 */
export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-secondary/60 backdrop-blur-sm"
        tabIndex={-1}
      />
      <div
        className={cn(
          "animate-scale-in relative max-h-[92svh] w-full overflow-y-auto rounded-t-xl bg-surface p-6 shadow-overlay sm:rounded-xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-h3">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
