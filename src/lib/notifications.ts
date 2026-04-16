import "server-only";

import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createUserNotifications(options: {
  recipientIds: string[];
  actorId?: string | null;
  documentId?: string | null;
  commentId?: string | null;
  type: NotificationType;
  metadata?: Prisma.InputJsonValue;
}) {
  const uniqueRecipients = Array.from(
    new Set(options.recipientIds.filter((recipientId) => recipientId && recipientId !== options.actorId)),
  );

  if (uniqueRecipients.length === 0) {
    return;
  }

  await prisma.userNotification.createMany({
    data: uniqueRecipients.map((userId) => ({
      userId,
      actorId: options.actorId ?? null,
      documentId: options.documentId ?? null,
      commentId: options.commentId ?? null,
      type: options.type,
      ...(typeof options.metadata === "undefined"
        ? {}
        : {
            metadata: options.metadata,
          }),
    })),
  });
}

export async function getUserNotificationState(userId: string) {
  const [unreadCount, notifications] = await Promise.all([
    prisma.userNotification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
    prisma.userNotification.findMany({
      where: {
        userId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
          },
        },
        comment: {
          select: {
            id: true,
            parentId: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 18,
    }),
  ]);

  return {
    unreadCount,
    notifications,
  };
}
