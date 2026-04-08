'use client';

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";

type ModalShellProps = {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
};

export function ModalShell({
  children,
  onClose,
  className,
}: ModalShellProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!overlayRef.current || !contentRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.18, ease: "power2.out" },
      );

      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: "power3.out" },
      );
    });

    return () => {
      ctx.revert();
    };
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/28 px-4 py-6 backdrop-blur-sm sm:items-center sm:px-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={contentRef}
        className={`modal-content ${className ?? ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
