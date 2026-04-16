'use client';

import { useEffect, useRef, useState } from "react";
import {
  moveDocumentToTrashAction,
  permanentlyDeleteDocumentAction,
  restoreDocumentAction,
  toggleArchiveDocumentAction,
  toggleFavoriteDocumentAction,
} from "@/app/actions/documents";
import { CommentPanel } from "@/components/docs/comment-panel";
import { HistoryPanel } from "@/components/docs/history-panel";
import { SharePanel } from "@/components/docs/share-panel";
import { CreateDocumentModal } from "@/components/docs/create-document-modal";
import { DocumentStateButton } from "@/components/docs/document-state-button";
import { cn } from "@/lib/utils";

type DocumentHeaderActionsProps = {
  documentId: string;
  appUrl: string;
  canEdit: boolean;
  canShare: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isFavorite: boolean;
  role: "owner" | "editor" | "viewer";
  shareLinks: Array<{
    id: string;
    token: string;
    role: "viewer" | "editor";
    isActive: boolean;
  }>;
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
  inviteCandidates: Array<{
    id: string;
    name: string | null;
    email: string;
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
      | "shareDisabled"
      | "commentAdded"
      | "commentResolved"
      | "commentReopened"
      | "versionRestored";
    createdAt: Date;
    metadata: Record<string, unknown> | null;
    actor: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  currentUserId: string;
  canComment: boolean;
  initialCommentId: string | null;
  comments: Array<{
    id: string;
    content: string;
    quote: string | null;
    resolvedAt: Date | null;
    resolvedBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      name: string | null;
      email: string;
    };
    replies: Array<{
      id: string;
      content: string;
      quote: string | null;
      createdAt: Date;
      updatedAt: Date;
      author: {
        id: string;
        name: string | null;
        email: string;
      };
    }>;
  }>;
  versions: Array<{
    id: string;
    title: string;
    source: "edit" | "rename" | "restore" | "system";
    createdAt: Date;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
};

function StarIcon({
  filled = false,
}: {
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} className="h-4 w-4">
      <path
        d="m10 2.9 2.16 4.38 4.84.7-3.5 3.4.83 4.81L10 14.3 5.67 16.2l.83-4.81L3 7.98l4.84-.7L10 2.9Z"
        stroke="currentColor"
        strokeWidth={filled ? "0" : "1.45"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4.75 5.25h10.5l-.75 9a1 1 0 0 1-1 .92h-7a1 1 0 0 1-1-.92l-.75-9ZM4 5.25V4a.75.75 0 0 1 .75-.75h10.5A.75.75 0 0 1 16 4v1.25M8 9.25h4"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M5.75 6.25h8.5m-7.5 0 .55 8.1c.03.52.47.92 1 .92h3.4c.53 0 .97-.4 1-.92l.55-8.1M8 6.25V5a.75.75 0 0 1 .75-.75h2.5A.75.75 0 0 1 12 5v1.25"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4.75 10a.75.75 0 1 0 0 .01V10Zm5.25 0a.75.75 0 1 0 0 .01V10Zm5.25 0a.75.75 0 1 0 0 .01V10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreActionsMenu({
  documentId,
  canEdit,
  isArchived,
  isFavorite,
}: {
  documentId: string;
  canEdit: boolean;
  isArchived: boolean;
  isFavorite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-black/[0.045] hover:text-foreground",
          open && "bg-black/[0.05] text-foreground",
        )}
        aria-label="更多文档操作"
        title="更多文档操作"
      >
        <MoreIcon />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-[208px] rounded-[18px] border border-black/8 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="space-y-1">
            <DocumentStateButton
              action={toggleFavoriteDocumentAction}
              documentId={documentId}
              label={isFavorite ? "取消收藏" : "加入收藏"}
              active={isFavorite}
              variant="menu"
              icon={<StarIcon filled={isFavorite} />}
            />

            {canEdit ? (
              <CreateDocumentModal
                parentId={documentId}
                triggerLabel="新建子页面"
                variant="menu"
              />
            ) : null}

            {canEdit ? (
              <DocumentStateButton
                action={toggleArchiveDocumentAction}
                documentId={documentId}
                label={isArchived ? "恢复文档" : "归档文档"}
                active={isArchived}
                variant="menu"
                icon={<ArchiveIcon />}
              />
            ) : null}

            {canEdit ? (
              <DocumentStateButton
                action={moveDocumentToTrashAction}
                documentId={documentId}
                label="移到回收站"
                variant="menu"
                icon={<TrashIcon />}
                successHref="/docs?view=trash"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DocumentHeaderActions({
  documentId,
  appUrl,
  canEdit,
  canShare,
  isArchived,
  isDeleted,
  isFavorite,
  role,
  shareLinks,
  owner,
  members,
  inviteCandidates,
  activities,
  currentUserId,
  canComment,
  initialCommentId,
  comments,
  versions,
}: DocumentHeaderActionsProps) {
  if (isDeleted) {
    return (
      <div className="flex items-center gap-1">
        {canEdit ? (
        <DocumentStateButton
          action={restoreDocumentAction}
          documentId={documentId}
          label="恢复"
          icon={<ArchiveIcon />}
          />
        ) : null}

        {role === "owner" ? (
          <DocumentStateButton
            action={permanentlyDeleteDocumentAction}
            documentId={documentId}
            label="彻底删除"
            icon={<TrashIcon />}
            successHref="/docs?view=trash"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {!isDeleted ? (
        <SharePanel
          documentId={documentId}
          appUrl={appUrl}
          canManage={canShare}
          owner={owner}
          members={members}
          inviteCandidates={inviteCandidates}
          shareLinks={shareLinks}
          activities={activities}
        />
      ) : null}

      {!isDeleted && canComment ? (
        <HistoryPanel
          documentId={documentId}
          canRestore={canEdit}
          versions={versions}
        />
      ) : null}

      {!isDeleted && canComment ? (
        <CommentPanel
          documentId={documentId}
          currentUserId={currentUserId}
          canComment={canComment}
          initialCommentId={initialCommentId}
          comments={comments}
        />
      ) : null}

      <MoreActionsMenu
        documentId={documentId}
        canEdit={canEdit}
        isArchived={isArchived}
        isFavorite={isFavorite}
      />
    </div>
  );
}
