import "server-only";

import { DocumentActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function recordDocumentActivity(options: {
  documentId: string;
  actorId?: string | null;
  type: DocumentActivityType;
  metadata?: Prisma.InputJsonValue;
}) {
  const { documentId, actorId, type, metadata } = options;

  await prisma.documentActivity.create({
    data: {
      documentId,
      actorId: actorId ?? null,
      type,
      ...(typeof metadata === "undefined"
        ? {}
        : {
            metadata,
          }),
    },
  });
}
