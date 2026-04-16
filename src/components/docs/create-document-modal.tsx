'use client';

import { useState } from "react";
import { CreateDocumentForm } from "@/components/docs/create-document-form";
import { ModalShell } from "@/components/ui/modal-shell";
import { cn } from "@/lib/utils";

type CreateDocumentModalProps = {
  parentId?: string;
  triggerLabel?: string;
  variant?: "primary" | "ghost" | "menu";
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 4.25v11.5M4.25 10h11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CreateDocumentModal({
  parentId,
  triggerLabel = "新建文档",
  variant = "primary",
}: CreateDocumentModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4",
          variant === "primary"
            ? "bg-[#151515] text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] hover:bg-black focus-visible:ring-black/10"
            : variant === "menu"
              ? "h-9 w-full justify-start rounded-lg px-3 text-muted hover:bg-black/[0.045] hover:text-foreground focus-visible:ring-black/6"
              : "text-muted hover:bg-black/[0.045] hover:text-foreground focus-visible:ring-black/6",
        )}
      >
        <PlusIcon />
        {triggerLabel}
      </button>

      {open ? (
        <ModalShell
          onClose={() => setOpen(false)}
          className="w-full max-w-md rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {parentId ? "新建子页面" : "新建文档"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.045] text-muted hover:bg-black/[0.08] hover:text-foreground"
              aria-label="关闭创建文档窗口"
            >
              x
            </button>
          </div>

          <div className="mt-5">
            <CreateDocumentForm parentId={parentId} />
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
