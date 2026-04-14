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
    },
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
  });
}
