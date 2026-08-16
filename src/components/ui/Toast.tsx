"use client";

import { CheckCircle2, Info } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Minimal toast bus: `toast("Booking confirmed")` from anywhere on the
 * client; <Toaster /> (mounted once in the root layout) renders the stack.
 */

export interface ToastMessage {
  id: number;
  text: string;
  tone: "success" | "info";
}

type Listener = (toast: ToastMessage) => void;

let nextId = 1;
const listeners = new Set<Listener>();

export function toast(text: string, tone: ToastMessage["tone"] = "success") {
  const message: ToastMessage = { id: nextId++, text, tone };
  for (const listener of listeners) listener(message);
}

export function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: Listener = (message) => {
      setMessages((current) => [...current, message]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((m) => m.id !== message.id));
      }, 4200);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-110 flex flex-col items-center gap-2 px-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className="animate-slide-up flex items-center gap-2.5 rounded-full border border-border bg-surface px-5 py-3 text-small font-medium shadow-lifted"
        >
          {message.tone === "success" ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden />
          ) : (
            <Info className="size-4 text-info" aria-hidden />
          )}
          {message.text}
        </div>
      ))}
    </div>
  );
}
