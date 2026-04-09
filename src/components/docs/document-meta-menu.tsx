'use client';

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type DocumentMetaMenuProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4.5 10a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM10 10a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 10ZM15.5 10a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DocumentMetaMenu({
  items,
}: DocumentMetaMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  function openMenu() {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    setOpen(true);
  }

  function closeMenuWithDelay() {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
    }

    leaveTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      leaveTimerRef.current = null;
    }, 140);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuWithDelay}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted transition hover:bg-black/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6",
          open && "bg-black/[0.05] text-foreground",
        )}
        aria-label="显示文档详细信息"
        aria-expanded={open}
      >
        <MoreIcon />
      </button>

      <div
        className={cn(
          "absolute right-0 top-full z-20 w-[260px] pt-2 transition duration-150",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0",
        )}
      >
        <div className="rounded-[20px] border border-black/8 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <span className="text-xs font-medium text-muted">{item.label}</span>
                <span className="max-w-[150px] text-right text-sm text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
