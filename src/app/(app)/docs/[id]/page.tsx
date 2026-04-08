import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireUser } from "@/lib/auth/session";
import { getDocumentAccess, getDocumentSharingState } from "@/lib/documents";
import { CollaborativeEditor } from "@/components/editor/collaborative-editor";
import { DocumentHeaderActions } from "@/components/docs/document-header-actions";
import { TitleForm } from "@/components/docs/title-form";
import { HeaderSlotRegistration } from "@/components/layout/header-slot";
import { nameFromEmail } from "@/lib/utils";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
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

  return `${userLabel} · ${formatDate(document.updatedAt)}`;
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

function DotDivider() {
  return <span className="text-black/18">·</span>;
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

  const sharingState = access.canShare
    ? await getDocumentSharingState(access.document.id)
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ownershipLabel = access.role === "owner" ? "所有者" : "协作者";
  const lastEditedLabel = getLastEditedLabel(access.document);

  return (
    <div className="flex w-full flex-col gap-0">
      <HeaderSlotRegistration>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f3] text-muted">
              <FileIcon />
            </span>

            <div className="min-w-0 flex-1">
              <div className="min-w-0">
                <TitleForm
                  documentId={access.document.id}
                  initialTitle={access.document.title}
                  canEdit={access.canEdit}
                  compact
                />
              </div>
              <div className="hidden min-w-0 items-center gap-2 overflow-hidden text-xs text-muted lg:flex">
                <span className="font-medium text-foreground/84">{ownershipLabel}</span>
                <DotDivider />
                <span>{access.canEdit ? "可编辑" : "只读"}</span>
                <DotDivider />
                <span>创建于 {formatDate(access.document.createdAt)}</span>
                <DotDivider />
                <span className="truncate">最后编辑 {lastEditedLabel}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <DocumentHeaderActions
              documentId={access.document.id}
              appUrl={appUrl}
              canEdit={access.canEdit}
              canShare={access.canShare}
              isArchived={access.document.isArchived}
              isFavorite={access.document.favorites.length > 0}
              shareLinks={sharingState?.shareLinks ?? []}
            />
          </div>
        </div>
      </HeaderSlotRegistration>

      <div className="px-4 py-3 sm:px-6 lg:px-8 lg:hidden">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="inline-flex h-8 items-center rounded-full bg-black/[0.045] px-3 font-medium text-foreground">
            {ownershipLabel}
          </span>
          <span className="inline-flex h-8 items-center rounded-full bg-black/[0.045] px-3 font-medium text-foreground">
            {access.canEdit ? "可编辑" : "只读"}
          </span>
          <span className="inline-flex h-8 items-center rounded-full bg-black/[0.045] px-3 font-medium text-foreground">
            创建于 {formatDate(access.document.createdAt)}
          </span>
          <span className="inline-flex h-8 max-w-full items-center truncate rounded-full bg-black/[0.045] px-3 font-medium text-foreground">
            最后编辑 {lastEditedLabel}
          </span>
        </div>
      </div>

      <CollaborativeEditor
        documentId={access.document.id}
        shareToken={share}
        canEdit={access.canEdit}
      />
    </div>
  );
}
