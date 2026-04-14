'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDocumentCommentAction,
  deleteDocumentCommentAction,
} from "@/app/actions/comments";
import { ModalShell } from "@/components/ui/modal-shell";
import { showToast } from "@/lib/toast";
import { nameFromEmail, userColorFromString } from "@/lib/utils";

type CommentPanelProps = {
  documentId: string;
  currentUserId: string;
  canComment: boolean;
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
};

function CommentIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M5.75 14.75H4.5a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H9.25L6 17.25v-2.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function getInitial(name: string | null, email: string) {
  return Array.from((name?.trim() || email).trim())[0]?.toUpperCase() ?? "?";
}

function formatRelativeTime(value: Date, updatedAt: Date) {
  const now = Date.now();
  const diff = now - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let label = "";

  if (diff < minute) {
    label = "刚刚";
  } else if (diff < hour) {
    label = `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  } else if (diff < day) {
    label = `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  } else if (diff < 30 * day) {
    label = `${Math.max(1, Math.floor(diff / day))} 天前`;
  } else {
    label = new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
    }).format(value);
  }

  if (updatedAt.getTime() - value.getTime() > 1000) {
    return `${label} · 已编辑`;
  }

  return label;
}

function CommentAvatar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: userColorFromString(email) }}
    >
      {getInitial(name, email)}
    </span>
  );
}

export function CommentPanel({
  documentId,
  currentUserId,
  canComment,
  comments,
}: CommentPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  async function refreshWithToast(result: {
    ok?: boolean;
    message?: string;
  }) {
    if (!result.ok) {
      showToast({
        message: result.message || "操作失败。",
        variant: "error",
      });
      return false;
    }

    showToast({
      message: result.message || "操作已完成。",
      variant: "success",
    });
    router.refresh();
    return true;
  }

  function handleSubmit() {
    startSubmitTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("content", draft);

      const ok = await refreshWithToast(await createDocumentCommentAction({}, formData));

      if (!ok) {
        return;
      }

      setDraft("");
    });
  }

  function handleDelete(commentId: string) {
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("commentId", commentId);
      await refreshWithToast(await deleteDocumentCommentAction({}, formData));
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6"
      >
        <CommentIcon />
        评论
        {comments.length > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-muted">
            {comments.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <ModalShell
          onClose={() => setOpen(false)}
          className="w-full max-w-xl rounded-[28px] border border-black/8 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex max-h-[min(80vh,720px)] flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-black/6 px-5 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">评论</h2>
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#f3f3ef] px-2 py-1 text-xs font-semibold text-foreground">
                  {comments.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.045] text-muted transition hover:bg-black/[0.08] hover:text-foreground"
                aria-label="关闭评论面板"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {canComment ? (
                <div className="border-b border-black/6 px-5 py-4">
                  <div className="rounded-[20px] bg-[#f8f8f5] p-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="写下评论"
                      className="min-h-[96px] w-full resize-none rounded-[16px] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted">{draft.trim().length}/2000</p>
                      <button
                        type="button"
                        disabled={isSubmitting || draft.trim().length === 0}
                        onClick={handleSubmit}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-[#151515] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/30"
                      >
                        {isSubmitting ? "发布中..." : "发布"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-b border-black/6 px-5 py-3 text-sm text-muted">
                  仅文档成员可以评论。
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      const canDelete = comment.author.id === currentUserId;

                      return (
                        <article
                          key={comment.id}
                          className="rounded-[20px] bg-[#fafaf8] px-4 py-3"
                        >
                          <div className="flex items-start gap-3">
                            <CommentAvatar
                              name={comment.author.name}
                              email={comment.author.email}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                  {comment.author.name?.trim() || nameFromEmail(comment.author.email)}
                                </p>
                                <p className="text-xs text-muted">
                                  {formatRelativeTime(comment.createdAt, comment.updatedAt)}
                                </p>
                              </div>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                {comment.content}
                              </p>
                            </div>

                            {canDelete ? (
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDelete(comment.id)}
                                className="inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs font-medium text-[#b94728] transition hover:bg-[#fff1ee] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                删除
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-full items-center justify-center px-6 py-12 text-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">还没有评论</p>
                      <p className="mt-1 text-sm text-muted">可以先留下第一条讨论。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
