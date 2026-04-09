import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/session";
import { getDocumentAccess, getDocumentSharingState } from "@/lib/documents";
import { CollaborativeEditor } from "@/components/editor/collaborative-editor";
import { DocumentHeaderActions } from "@/components/docs/document-header-actions";
import { DocumentMetaMenu } from "@/components/docs/document-meta-menu";
import { TitleForm } from "@/components/docs/title-form";
import { HeaderSlotRegistration } from "@/components/layout/header-slot";
import { nameFromEmail } from "@/lib/utils";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatRelativeDocumentTime(value: Date) {
  const now = new Date();
  const diff = now.getTime() - value.getTime();
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

  if (now.getFullYear() === value.getFullYear()) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
    }).format(value);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(value);
}

function getLastEditedLabel(document: {
  updatedAt: Date;
  lastEditedBy: {
    name: string | null;
    email: string;
  } | null;
}) {
  const userLabel = document.lastEditedBy?.name?.trim()
    || (document.lastEditedBy?.email ? nameFromEmail(document.lastEditedBy.email) : "未知用户");

  return `${userLabel} · ${formatRelativeDocumentTime(document.updatedAt)}`;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M6 3.75h5.3c.2 0 .39.08.53.22l2.2 2.2c.14.14.22.33.22.53V15.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-11A.75.75 0 0 1 6 3.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 3.95V6.5h2.55"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ share?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await requireUser();
  const { id } = await params;
  const { share } = await searchParams;

  const access = await getDocumentAccess({
    documentId: id,
    userId: user.id,
    shareToken: share,
  });

  if (!access) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ownershipLabel = access.role === "owner" ? "所有者" : "协作者";
  const lastEditedLabel = getLastEditedLabel(access.document);
  const isDeleted = Boolean(access.document.deletedAt);
  const pageCanEdit = access.canEdit && !isDeleted;
  const pageCanShare = access.canShare && !isDeleted;
  const sharingState = pageCanShare
    ? await getDocumentSharingState(access.document.id)
    : null;
  const metaItems = [
    {
      label: "角色",
      value: ownershipLabel,
    },
    {
      label: "权限",
      value: pageCanEdit ? "可编辑" : "只读",
    },
    {
      label: "创建时间",
      value: formatDate(access.document.createdAt),
    },
    {
      label: "最后编辑",
      value: `${lastEditedLabel} (${formatDate(access.document.updatedAt)})`,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-0">
      <HeaderSlotRegistration>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f3] text-muted">
              <FileIcon />
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="min-w-0 flex-1">
                <TitleForm
                  documentId={access.document.id}
                  initialTitle={access.document.title}
                  canEdit={pageCanEdit}
                  compact
                />
              </div>

              <div className="hidden shrink-0 items-center gap-2 text-xs text-muted lg:flex">
                <span className="whitespace-nowrap">最后编辑 {lastEditedLabel}</span>
                <DocumentMetaMenu items={metaItems} />
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <DocumentHeaderActions
              documentId={access.document.id}
              appUrl={appUrl}
              canEdit={pageCanEdit}
              canShare={pageCanShare}
              isArchived={access.document.isArchived}
              isDeleted={isDeleted}
              isFavorite={access.document.favorites.length > 0}
              role={access.role}
              shareLinks={sharingState?.shareLinks ?? []}
            />
          </div>
        </div>
      </HeaderSlotRegistration>

      <div className="px-4 py-3 sm:px-6 lg:px-8 lg:hidden">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span className="truncate">最后编辑 {lastEditedLabel}</span>
          <DocumentMetaMenu items={metaItems} />
        </div>
      </div>

      {isDeleted ? (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-semibold text-foreground">该文档已在回收站中</p>
            <p className="max-w-md text-sm text-muted">
              回收站中的文档会从主导航中隐藏。恢复后即可继续编辑和分享。
            </p>
          </div>
        </div>
      ) : (
        <CollaborativeEditor
          documentId={access.document.id}
          shareToken={share}
          canEdit={pageCanEdit}
        />
      )}
    </div>
  );
}
