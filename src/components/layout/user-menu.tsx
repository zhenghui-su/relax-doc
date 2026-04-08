'use client';

import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type UserMenuProps = {
  name: string;
  email: string;
};

function getInitial(name: string, email: string) {
  return Array.from((name || email).trim())[0]?.toUpperCase() ?? "?";
}

export function UserMenu({ name, email }: UserMenuProps) {
  const initial = getInitial(name, email);
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
    }, 120);
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
        className="inline-flex h-9 items-center gap-2 rounded-full bg-white/90 px-2.5 pr-3 text-sm font-medium text-foreground ring-1 ring-black/8 transition hover:bg-white"
        aria-label="当前用户菜单"
        aria-expanded={open}
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#151515] text-xs font-semibold text-white">
          {initial}
        </span>
        <span className="max-w-[120px] truncate">{name}</span>
      </button>

      <div
        className={`absolute right-0 top-full z-20 min-w-[200px] pt-2 transition duration-150 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        <div className="rounded-[20px] border border-black/8 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="mt-1 break-all text-xs text-muted">{email}</p>
          <LogoutButton className="mt-3 w-full justify-center !bg-white !text-foreground ring-1 ring-black/8 hover:!bg-black/[0.03]" />
        </div>
      </div>
    </div>
  );
}
