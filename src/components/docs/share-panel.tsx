'use client';

import { type ShareAccess } from "@prisma/client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createShareLinkAction } from "@/app/actions/sharing";
import { SubmitButton } from "@/components/ui/submit-button";
import { ModalShell } from "@/components/ui/modal-shell";
import { emptyFormState } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";

type ShareMode = ShareAccess | "disabled";

type SharePanelProps = {
  documentId: string;
  appUrl: string;
  shareLinks: Array<{
    id: string;
    token: string;
    role: ShareAccess;
    isActive: boolean;
  }>;
};

const shareOptions: Array<{
  value: ShareMode;
  label: string;
  description: string;
}> = [
  {
    value: "disabled",
    label: "关闭外链",
    description: "仅成员可以访问",
  },
  {
    value: "viewer",
    label: "仅查看",
    description: "任何持链用户可查看",
  },
  {
    value: "editor",
    label: "可编辑",
    description: "任何持链用户可编辑",
  },
];

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="m6 6 8 8m0-8-8 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M13.75 6.25a2.25 2.25 0 1 0-2.05-3.18L7.9 5.24a2.25 2.25 0 0 0 0 4.52l3.8 2.17a2.25 2.25 0 1 0 .7-1.22L8.6 8.54a2.26 2.26 0 0 0 0-1.08l3.8-2.17c.38.58 1.03.96 1.75.96Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SharePanel({
  documentId,
  appUrl,
  shareLinks,
}: SharePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeRole = useMemo<ShareMode>(() => {
    return shareLinks.find((link) => link.isActive)?.role ?? "disabled";
  }, [shareLinks]);
  const [shareMode, setShareMode] = useState<ShareMode>(activeRole);
  const [state, action] = useActionState(createShareLinkAction, emptyFormState);
  const createdToken = state.data?.token;

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

    if (typeof createdToken === "string") {
      const href = `${appUrl}/share/${createdToken}`;

      void navigator.clipboard.writeText(href).then(
        () => {
          showToast({
            message: "链接已复制到剪贴板。",
            variant: "success",
          });
        },
        () => {
          showToast({
            message: "链接已生成，但复制失败，请手动复制。",
            variant: "error",
          });
        },
      );
    } else {
      showToast({
        message: state.message || "公开分享已关闭。",
        variant: "success",
      });
    }

    router.refresh();
    window.setTimeout(() => {
      setOpen(false);
    }, 0);
  }, [appUrl, createdToken, router, state.message, state.ok]);

  function openModal() {
    setShareMode(activeRole);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6"
      >
        <ShareIcon />
        分享
      </button>

      {open ? (
        <ModalShell
          onClose={() => setOpen(false)}
          className="w-full max-w-lg rounded-[28px] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">分享文档</h2>
              <p className="mt-1 text-sm text-muted">
                选择外链权限，系统会自动替换旧链接。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.045] text-muted transition hover:bg-black/[0.08] hover:text-foreground"
              aria-label="关闭分享窗口"
            >
              <CloseIcon />
            </button>
          </div>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="role" value={shareMode} />

            <div className="grid gap-3">
              {shareOptions.map((option) => {
                const selected = shareMode === option.value;
                const highlighted = activeRole === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setShareMode(option.value)}
                    className={cn(
                      "flex items-start justify-between rounded-[22px] border px-4 py-4 text-left transition",
                      selected
                        ? "border-black/12 bg-[#151515] text-white shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                        : "border-black/8 bg-[#fafaf9] text-foreground hover:border-black/12 hover:bg-white",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span
                        className={cn(
                          "mt-1 block text-sm",
                          selected ? "text-white/72" : "text-muted",
                        )}
                      >
                        {option.description}
                      </span>
                    </span>
                    {highlighted ? (
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          selected
                            ? "bg-white/14 text-white"
                            : "bg-black/[0.05] text-muted",
                        )}
                      >
                        当前
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[22px] bg-black/[0.03] px-4 py-3 text-sm text-muted">
              {shareMode === "disabled"
                ? "关闭后，所有公开外链会立即失效。"
                : "提交后会自动生成最新链接、复制到剪贴板，并关闭窗口。"}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground"
              >
                取消
              </button>
              <SubmitButton pendingLabel={shareMode === "disabled" ? "关闭中..." : "生成中..."}>
                {shareMode === "disabled" ? "关闭公开分享" : "生成并复制链接"}
              </SubmitButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
