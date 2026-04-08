'use client';

import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { emptyFormState, type FormState } from "@/lib/auth/validation";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type DocumentStateButtonProps = {
  action: (
    previousState: FormState,
    formData: FormData,
  ) => Promise<FormState>;
  documentId: string;
  label: string;
  active?: boolean;
  icon: ReactNode;
  variant?: "default" | "icon";
  title?: string;
};

export function DocumentStateButton({
  action,
  documentId,
  label,
  active = false,
  icon,
  variant = "default",
  title,
}: DocumentStateButtonProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, emptyFormState);

  useEffect(() => {
    if (!state.ok) {
      if (state.message) {
        showToast({
          message: state.message,
          variant: "error",
        });
      }
      return;
    }

    showToast({
      message: state.message || "操作已完成。",
      variant: "success",
    });
    router.refresh();
  }, [router, state.message, state.ok]);

  return (
    <form action={formAction}>
      <input type="hidden" name="documentId" value={documentId} />
      <button
        type="submit"
        aria-label={title || label}
        title={title || label}
        className={cn(
          "inline-flex items-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6",
          variant === "icon"
            ? "h-8 w-8 justify-center text-muted"
            : "h-9 gap-2 px-3 text-sm",
          active
            ? "bg-black/[0.06] text-foreground"
            : "text-muted hover:bg-black/[0.045] hover:text-foreground",
        )}
      >
        {icon}
        {variant === "default" ? label : <span className="sr-only">{label}</span>}
      </button>
    </form>
  );
}
