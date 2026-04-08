import { auth } from "@/auth";
import { signCollabToken } from "@/lib/collab";
import { getDocumentAccess } from "@/lib/documents";
import { nameFromEmail, userColorFromString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const shareToken = url.searchParams.get("share");

  const access = await getDocumentAccess({
    documentId: id,
    userId: session.user.id,
    shareToken,
  });

  if (!access) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const name = session.user.name ?? nameFromEmail(session.user.email);
  const color = userColorFromString(session.user.email);

  const token = await signCollabToken({
    documentId: id,
    userId: session.user.id,
    role: access.role,
    name,
    email: session.user.email,
    color,
  });

  return Response.json({
    token,
    url: process.env.NEXT_PUBLIC_COLLAB_SERVER_URL,
    role: access.role,
    user: {
      id: session.user.id,
      name,
      email: session.user.email,
      color,
    },
  });
}
