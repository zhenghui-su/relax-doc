'use client';

import {
  toggleArchiveDocumentAction,
  toggleFavoriteDocumentAction,
} from "@/app/actions/documents";
import { DocumentStateButton } from "@/components/docs/document-state-button";

type DocumentRowActionsProps = {
  documentId: string;
  canEdit: boolean;
  isArchived: boolean;
  isFavorite: boolean;
};

function StarIcon({ filled = false }: { filled?: boolean }) {
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

export function DocumentRowActions({
  documentId,
  canEdit,
  isArchived,
  isFavorite,
}: DocumentRowActionsProps) {
  return (
    <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <DocumentStateButton
        action={toggleFavoriteDocumentAction}
        documentId={documentId}
        label={isFavorite ? "取消收藏" : "加入收藏"}
        title={isFavorite ? "取消收藏" : "加入收藏"}
        active={isFavorite}
        variant="icon"
        icon={<StarIcon filled={isFavorite} />}
      />

      {canEdit ? (
        <DocumentStateButton
          action={toggleArchiveDocumentAction}
          documentId={documentId}
          label={isArchived ? "恢复文档" : "归档文档"}
          title={isArchived ? "恢复文档" : "归档文档"}
          active={isArchived}
          variant="icon"
          icon={<ArchiveIcon />}
        />
      ) : null}
    </div>
  );
}
