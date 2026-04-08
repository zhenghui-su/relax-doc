'use client';

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { ToastPayload, ToastVariant } from "@/lib/toast";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

const toastStyles: Record<ToastVariant, string> = {
  info: "border-black/8 bg-white text-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      const id = window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, 2200);

      setItems((current) => [
        ...current,
        {
          id,
          message: detail.message,
          variant: detail.variant ?? "info",
        },
      ]);
    }

    window.addEventListener("app-toast", handleToast);

    return () => {
      window.removeEventListener("app-toast", handleToast);
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current?.lastElementChild;

    if (!element) {
      return;
    }

    gsap.fromTo(
      element,
      { opacity: 0, y: 10, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "power3.out" },
    );
  }, [items]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-full max-w-sm flex-col gap-2 px-4 sm:bottom-6 sm:right-6"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`toast-item pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_16px_40px_rgba(15,23,42,0.12)] ${toastStyles[item.variant]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
