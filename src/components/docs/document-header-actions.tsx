'use client';

import {
  moveDocumentToTrashAction,
  permanentlyDeleteDocumentAction,
  restoreDocumentAction,
  toggleArchiveDocumentAction,
  toggleFavoriteDocumentAction,
} from "@/app/actions/documents";
import { SharePanel } from "@/components/docs/share-panel";
import { CreateDocumentModal } from "@/components/docs/create-document-modal";
import { DocumentStateButton } from "@/components/docs/document-state-button";

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
    <div className="flex items-center gap-1">
      <DocumentStateButton
        action={toggleFavoriteDocumentAction}
        documentId={documentId}
        label={isFavorite ? "已收藏" : "收藏"}
        active={isFavorite}
        icon={<StarIcon filled={isFavorite} />}
      />

      {canEdit ? (
        <CreateDocumentModal
          parentId={documentId}
          triggerLabel="子页面"
          variant="ghost"
        />
      ) : null}

      {canEdit ? (
        <DocumentStateButton
          action={toggleArchiveDocumentAction}
          documentId={documentId}
          label={isArchived ? "恢复" : "归档"}
          active={isArchived}
          icon={<ArchiveIcon />}
        />
      ) : null}

      {canEdit ? (
        <DocumentStateButton
          action={moveDocumentToTrashAction}
          documentId={documentId}
          label="移到回收站"
          icon={<TrashIcon />}
          successHref="/docs?view=trash"
        />
      ) : null}

      {canShare ? (
        <SharePanel
          documentId={documentId}
          appUrl={appUrl}
          shareLinks={shareLinks}
        />
      ) : null}
    </div>
  );
}
