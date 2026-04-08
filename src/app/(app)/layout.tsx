import Link from "next/link";
import { listDocumentsForUser } from "@/lib/documents";
import { requireUser } from "@/lib/auth/session";
import { HeaderSlotProvider } from "@/components/layout/header-slot";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const userLabel = user.name?.trim() || user.email || "用户";
  const documents = await listDocumentsForUser(user.id);

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
        >
          {children}
        </HeaderSlotProvider>
      </div>
    </div>
  );
}
