import "server-only";

import { prisma } from "@/lib/db";
import { getDocumentAccess } from "@/lib/documents";

export async function getDocumentComments(options: {
  documentId: string;
  userId: string;
  shareToken?: string | null;
}) {
  const access = await getDocumentAccess(options);

  if (!access || access.source !== "member") {
    return null;
  }

  return prisma.documentComment.findMany({
    where: {
      documentId: options.documentId,
      parentId: null,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      replies: {
        include: {
          author: {
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
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
