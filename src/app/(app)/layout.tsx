import Link from "next/link";
import { listDocumentsForUser } from "@/lib/documents";
import { requireUser } from "@/lib/auth/session";
import { HeaderSlotProvider } from "@/components/layout/header-slot";
import { getUserNotificationState } from "@/lib/notifications";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const userLabel = user.name?.trim() || user.email || "用户";
  const [documents, notifications] = await Promise.all([
    listDocumentsForUser(user.id),
    getUserNotificationState(user.id),
  ]);

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <HeaderSlotProvider
          fallback={
            <Link href="/docs" className="text-sm font-semibold tracking-tight text-foreground">
              文档
            </Link>
          }
          userName={userLabel}
          userEmail={user.email || ""}
          documents={documents}
          notifications={{
            unreadCount: notifications.unreadCount,
            notifications: notifications.notifications.map((notification) => ({
              id: notification.id,
              type: notification.type,
              isRead: notification.isRead,
              createdAt: notification.createdAt,
              metadata:
                notification.metadata
                && typeof notification.metadata === "object"
                && !Array.isArray(notification.metadata)
                  ? (notification.metadata as Record<string, unknown>)
                  : null,
              actor: notification.actor,
              document: notification.document,
              comment: notification.comment,
            })),
          }}
        >
          {children}
        </HeaderSlotProvider>
      </div>
    </div>
  );
}
