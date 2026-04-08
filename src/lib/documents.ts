import "server-only";

import { type Document } from "@prisma/client";
import { prisma } from "@/lib/db";
import { type DocumentListItem } from "@/types/document";

export type AccessRole = "owner" | "editor" | "viewer";
export type AccessDocument = Document & {
  lastEditedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  favorites: Array<{
    id: string;
  }>;
};

export type ListedDocument = DocumentListItem;

export type DocumentAccess = {
  document: AccessDocument;
  role: AccessRole;
  source: "member" | "link";
  canEdit: boolean;
  canShare: boolean;
};

function toAccess(role: AccessRole, document: AccessDocument, source: "member" | "link") {
  return {
    document,
    role,
    source,
    canEdit: role === "owner" || role === "editor",
    canShare: role === "owner",
  } satisfies DocumentAccess;
}

export async function getDocumentAccess(options: {
  documentId: string;
  userId: string;
  shareToken?: string | null;
}) {
  const { documentId, userId, shareToken } = options;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      lastEditedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      favorites: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!document) {
    return null;
  }

  if (document.ownerId === userId) {
    return toAccess("owner", document, "member");
  }

  const member = await prisma.documentMember.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId,
      },
    },
  });

  if (member) {
    return toAccess(member.role, document, "member");
  }

  if (!shareToken) {
    return null;
  }

  const link = await prisma.documentShareLink.findFirst({
    where: {
      documentId,
      token: shareToken,
      isActive: true,
    },
  });

  if (!link) {
    return null;
  }

  return toAccess(link.role, document, "link");
}

export async function listDocumentsForUser(userId: string) {
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
      favorites: {
        where: { userId },
        select: { id: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    parentId: document.parentId,
    updatedAt: document.updatedAt,
    createdAt: document.createdAt,
    isArchived: document.isArchived,
    isFavorite: document.favorites.length > 0,
    role:
      document.ownerId === userId
        ? ("owner" as const)
        : (document.members[0]?.role ?? "viewer"),
  })) satisfies ListedDocument[];
}

export async function getDocumentSharingState(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      shareLinks: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}
