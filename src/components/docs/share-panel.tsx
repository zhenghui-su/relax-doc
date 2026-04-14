'use client';

import { type ShareAccess } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createShareLinkAction,
  inviteDocumentMemberAction,
  removeDocumentMemberAction,
  updateDocumentMemberRoleAction,
} from "@/app/actions/sharing";
import { ModalShell } from "@/components/ui/modal-shell";
import { showToast } from "@/lib/toast";
import { cn, nameFromEmail, roleLabel, userColorFromString } from "@/lib/utils";

type ShareMode = ShareAccess | "disabled";

type SharePanelProps = {
  documentId: string;
  appUrl: string;
  canManage: boolean;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  members: Array<{
    id: string;
    role: "owner" | "editor" | "viewer";
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  shareLinks: Array<{
    id: string;
    token: string;
    role: ShareAccess;
    isActive: boolean;
  }>;
  activities: Array<{
    id: string;
    type:
      | "created"
      | "renamed"
      | "archived"
      | "restored"
      | "trashed"
      | "moved"
      | "memberInvited"
      | "memberRoleChanged"
      | "memberRemoved"
      | "shareEnabled"
      | "shareDisabled";
    createdAt: Date;
    metadata: Record<string, unknown> | null;
    actor: {
      id: string;
      name: string | null;
      email: string;
    } | null;
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
    description: "仅成员可访问",
  },
  {
    value: "viewer",
    label: "仅查看",
    description: "持链用户可以查看",
  },
  {
    value: "editor",
    label: "可编辑",
    description: "持链用户可以编辑",
  },
];

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

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 4.5a5.5 5.5 0 1 1-5.2 7.3M5 6v4h4M10 7.25v3l2.1 1.35"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M6.75 8.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13.25 9.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 15.25a2.75 2.75 0 0 1 5.5 0v.5H4v-.5ZM10.5 15.75v-.5a2.75 2.75 0 0 1 5.5 0v.5h-5.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M7.25 6.25V5a1 1 0 0 1 1-1h6.25a1 1 0 0 1 1 1v8.75a1 1 0 0 1-1 1H8.25a1 1 0 0 1-1-1v-1.25M5.5 7.25h6.25a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8.25a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitial(name: string | null, email: string) {
  return Array.from((name?.trim() || email).trim())[0]?.toUpperCase() ?? "?";
}

function formatRelativeTime(value: Date) {
  const now = Date.now();
  const target = new Date(value).getTime();
  const diff = now - target;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  }

  if (diff < 30 * day) {
    return `${Math.max(1, Math.floor(diff / day))} 天前`;
  }

  const date = new Date(value);
  const currentYear = new Date().getFullYear();

  if (date.getFullYear() === currentYear) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function actorLabel(actor: { name: string | null; email: string } | null) {
  if (!actor) {
    return "未知成员";
  }

  return actor.name?.trim() || nameFromEmail(actor.email);
}

function metadataLabel(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function describeActivity(activity: SharePanelProps["activities"][number]) {
  const actor = actorLabel(activity.actor);
  const metadata = activity.metadata ?? {};
  const targetLabel = metadataLabel(metadata.targetUserLabel);
  const role = metadataLabel(metadata.role);
  const title = metadataLabel(metadata.title);

  switch (activity.type) {
    case "created":
      return `${actor} 创建了文档`;
    case "renamed":
      return `${actor} 将标题更新为“${title || "未命名文档"}”`;
    case "archived":
      return `${actor} 归档了文档`;
    case "restored":
      return `${actor} 恢复了文档`;
    case "trashed":
      return `${actor} 将文档移入回收站`;
    case "moved":
      return `${actor} 调整了页面层级`;
    case "memberInvited":
      return `${actor} 邀请 ${targetLabel || "新成员"} 加入文档`;
    case "memberRoleChanged":
      return `${actor} 将 ${targetLabel || "成员"} 的权限改为 ${roleLabel((role as "editor" | "viewer") || "viewer")}`;
    case "memberRemoved":
      return `${actor} 移除了 ${targetLabel || "成员"}`;
    case "shareEnabled":
      return `${actor} 开启了${role === "editor" ? "可编辑" : "只读"}外链`;
    case "shareDisabled":
      return `${actor} 关闭了公开分享`;
    default:
      return `${actor} 更新了文档`;
  }
}

function CollaboratorAvatar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const initial = getInitial(name, email);

  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: userColorFromString(email) }}
    >
      {initial}
    </span>
  );
}

function MemberRow({
  documentId,
  member,
  canManage,
  onRoleChange,
  onRemove,
  pending,
}: {
  documentId: string;
  member: SharePanelProps["members"][number];
  canManage: boolean;
  onRoleChange: (input: {
    documentId: string;
    memberId: string;
    role: "editor" | "viewer";
  }) => void;
  onRemove: (input: {
    documentId: string;
    memberId: string;
  }) => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-[#fafaf8] px-3 py-3">
      <CollaboratorAvatar name={member.user.name} email={member.user.email} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.user.name?.trim() || nameFromEmail(member.user.email)}
        </p>
        <p className="truncate text-xs text-muted">{member.user.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-muted ring-1 ring-black/6">
          {member.role === "owner" ? "所有者" : roleLabel(member.role)}
        </span>

        {canManage && member.role !== "owner" ? (
          <>
            <select
              value={member.role}
              disabled={pending}
              onChange={(event) => {
                const role = event.target.value as "editor" | "viewer";
                if (role === member.role) {
                  return;
                }

                onRoleChange({
                  documentId,
                  memberId: member.user.id,
                  role,
                });
              }}
              className="h-9 rounded-xl border border-black/8 bg-white px-3 text-sm text-foreground outline-none"
            >
              <option value="editor">可编辑</option>
              <option value="viewer">只读</option>
            </select>

            <button
              type="button"
              disabled={pending}
              onClick={() => onRemove({ documentId, memberId: member.user.id })}
              className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-medium text-[#b94728] transition hover:bg-[#fff1ee] disabled:cursor-not-allowed disabled:opacity-60"
            >
              移除
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function SharePanel({
  documentId,
  appUrl,
  canManage,
  owner,
  members,
  shareLinks,
  activities,
}: SharePanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>(() => {
    return shareLinks.find((link) => link.isActive)?.role ?? "disabled";
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isSharePending, startShareTransition] = useTransition();
  const [isInvitePending, startInviteTransition] = useTransition();
  const [isMemberPending, startMemberTransition] = useTransition();

  const activeLink = useMemo(() => {
    return shareLinks.find((link) => link.isActive) ?? null;
  }, [shareLinks]);

  const activeRole = activeLink?.role ?? "disabled";
  const allMembers = useMemo(() => {
    return [
      {
        id: `owner-${owner.id}`,
        role: "owner" as const,
        user: owner,
      },
      ...members,
    ];
  }, [members, owner]);

  async function refreshWithToast(result: {
    ok?: boolean;
    message?: string;
    data?: Record<string, string | boolean | undefined>;
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

  function handleShareSubmit() {
    startShareTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("role", shareMode);

      const result = await createShareLinkAction({}, formData);
      const ok = await refreshWithToast(result);

      if (!ok) {
        return;
      }

      const token = result.data?.token;

      if (typeof token === "string") {
        const href = `${appUrl}/share/${token}`;
        void navigator.clipboard.writeText(href).then(
          () => {
            showToast({
              message: "分享链接已复制到剪贴板。",
              variant: "success",
            });
          },
          () => {
            showToast({
              message: "链接已生成，但自动复制失败。",
              variant: "error",
            });
          },
        );
      }
    });
  }

  function handleInviteSubmit() {
    startInviteTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("email", inviteEmail);
      formData.set("role", inviteRole);

      const result = await inviteDocumentMemberAction({}, formData);
      const ok = await refreshWithToast(result);

      if (!ok) {
        return;
      }

      setInviteEmail("");
    });
  }

  function handleRoleChange(input: {
    documentId: string;
    memberId: string;
    role: "editor" | "viewer";
  }) {
    startMemberTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", input.documentId);
      formData.set("memberId", input.memberId);
      formData.set("role", input.role);
      const result = await updateDocumentMemberRoleAction({}, formData);
      await refreshWithToast(result);
    });
  }

  function handleRemove(input: {
    documentId: string;
    memberId: string;
  }) {
    startMemberTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", input.documentId);
      formData.set("memberId", input.memberId);
      const result = await removeDocumentMemberAction({}, formData);
      await refreshWithToast(result);
    });
  }

  async function copyCurrentLink() {
    if (!activeLink) {
      showToast({
        message: "当前没有可用的公开链接。",
        variant: "error",
      });
      return;
    }

    const href = `${appUrl}/share/${activeLink.token}`;
    try {
      await navigator.clipboard.writeText(href);
      showToast({
        message: "分享链接已复制。",
        variant: "success",
      });
    } catch {
      showToast({
        message: "复制失败，请稍后重试。",
        variant: "error",
      });
    }
  }

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
        协作
      </button>

      {open ? (
        <ModalShell
          onClose={() => setOpen(false)}
          className="w-full max-w-4xl rounded-[30px] border border-black/8 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-black/6 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">协作与分享</h2>
              <p className="mt-1 text-sm text-muted">
                管理外链权限、团队成员和最近的协作动态。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.045] text-muted transition hover:bg-black/[0.08] hover:text-foreground"
              aria-label="关闭协作面板"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 px-6 py-6">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-[#f5f5f3] text-muted">
                      <ShareIcon />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">公开链接</p>
                      <p className="text-xs text-muted">外部访问权限和复制入口</p>
                    </div>
                  </div>

                  {activeLink ? (
                    <button
                      type="button"
                      onClick={() => void copyCurrentLink()}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#f5f5f3] px-3 text-sm font-medium text-foreground transition hover:bg-[#efefeb]"
                    >
                      <CopyIcon />
                      复制链接
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {shareOptions.map((option) => {
                    const selected = shareMode === option.value;
                    const highlighted = activeRole === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setShareMode(option.value)}
                        className={cn(
                          "rounded-[22px] border px-4 py-4 text-left transition",
                          selected
                            ? "border-black/12 bg-[#151515] text-white shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                            : "border-black/8 bg-[#fafaf8] text-foreground hover:border-black/12 hover:bg-white",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className={cn("mt-1 text-sm", selected ? "text-white/72" : "text-muted")}>
                              {option.description}
                            </p>
                          </div>

                          {highlighted ? (
                            <span
                              className={cn(
                                "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                selected ? "bg-white/14 text-white" : "bg-black/[0.05] text-muted",
                              )}
                            >
                              当前
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {canManage ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#fafaf8] px-4 py-3">
                    <p className="text-sm text-muted">
                      {shareMode === "disabled"
                        ? "关闭后，所有公开外链都会立即失效。"
                        : "保存后会生成新的外链并复制到剪贴板。"}
                    </p>
                    <button
                      type="button"
                      disabled={isSharePending}
                      onClick={handleShareSubmit}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#151515] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/30"
                    >
                      {isSharePending
                        ? "保存中..."
                        : (shareMode === "disabled" ? "关闭公开分享" : "生成并复制")}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[22px] bg-[#fafaf8] px-4 py-3 text-sm text-muted">
                    你当前可以查看成员和活动记录，但不能修改外链或成员权限。
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-[#f5f5f3] text-muted">
                    <UsersIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">成员</p>
                    <p className="text-xs text-muted">当前可访问此文档的团队成员</p>
                  </div>
                </div>

                {canManage ? (
                  <div className="rounded-[24px] bg-[#fafaf8] p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_136px_auto]">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="输入已注册成员邮箱"
                        className="h-11 rounded-xl border border-black/8 bg-white px-3 text-sm text-foreground outline-none placeholder:text-muted"
                      />
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}
                        className="h-11 rounded-xl border border-black/8 bg-white px-3 text-sm text-foreground outline-none"
                      >
                        <option value="editor">可编辑</option>
                        <option value="viewer">只读</option>
                      </select>
                      <button
                        type="button"
                        disabled={isInvitePending || !inviteEmail.trim()}
                        onClick={handleInviteSubmit}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#151515] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/30"
                      >
                        {isInvitePending ? "邀请中..." : "邀请成员"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {allMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      documentId={documentId}
                      member={member}
                      canManage={canManage}
                      onRoleChange={handleRoleChange}
                      onRemove={handleRemove}
                      pending={isMemberPending}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="border-t border-black/6 bg-[#fbfbfa] px-6 py-6 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-white text-muted ring-1 ring-black/6">
                  <HistoryIcon />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">最近活动</p>
                  <p className="text-xs text-muted">帮助成员了解最近谁改了什么</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="rounded-[22px] bg-white px-4 py-3 ring-1 ring-black/6">
                      <p className="text-sm leading-6 text-foreground">{describeActivity(activity)}</p>
                      <p className="mt-1 text-xs text-muted">{formatRelativeTime(activity.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] bg-white px-4 py-4 text-sm text-muted ring-1 ring-black/6">
                    暂时还没有协作记录。
                  </div>
                )}
              </div>
            </aside>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
