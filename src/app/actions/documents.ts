'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  createDocumentSchema,
  documentStateSchema,
  updateDocumentTitleSchema,
  type FormState,
} from "@/lib/auth/validation";
import { getDocumentAccess } from "@/lib/documents";

export async function createDocumentAction(formData: FormData) {
  const user = await requireUser("/docs");
  const validated = createDocumentSchema.safeParse({
    title: formData.get("title"),
    parentId: formData.get("parentId"),
  });

  const title = validated.success
    ? validated.data.title
    : "未命名文档";
  const parentId =
    validated.success && validated.data.parentId
      ? validated.data.parentId
      : null;

  if (parentId) {
    const parentAccess = await getDocumentAccess({
      documentId: parentId,
      userId: user.id,
    });

    if (!parentAccess?.canEdit) {
      redirect("/docs");
    }
  }

  const document = await prisma.document.create({
    data: {
      title,
      ownerId: user.id,
      parentId,
      lastEditedById: user.id,
    },
  });

  revalidatePath("/docs");
  redirect(`/docs/${document.id}`);
}

export async function updateDocumentTitleAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const validated = updateDocumentTitleSchema.safeParse({
    documentId: formData.get("documentId"),
    title: formData.get("title"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "更新标题失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access?.canEdit) {
    return {
      ok: false,
      message: "你没有权限修改文档标题。",
    };
  }

  await prisma.document.update({
    where: { id: validated.data.documentId },
    data: {
      title: validated.data.title,
      lastEditedById: user.id,
    },
  });

  revalidatePath("/docs");
  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: "标题已更新。",
  };
}

export async function toggleFavoriteDocumentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/docs");
  const validated = documentStateSchema.safeParse({
    documentId: formData.get("documentId"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "更新收藏失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access) {
    return {
      ok: false,
      message: "文档不存在或你无权访问。",
    };
  }

  const existingFavorite = await prisma.documentFavorite.findUnique({
    where: {
      documentId_userId: {
        documentId: validated.data.documentId,
        userId: user.id,
      },
    },
  });

  if (existingFavorite) {
    await prisma.documentFavorite.delete({
      where: {
        documentId_userId: {
          documentId: validated.data.documentId,
          userId: user.id,
        },
      },
    });
  } else {
    await prisma.documentFavorite.create({
      data: {
        documentId: validated.data.documentId,
        userId: user.id,
      },
    });
  }

  revalidatePath("/docs");
  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: existingFavorite ? "已取消收藏。" : "已加入收藏。",
  };
}

export async function toggleArchiveDocumentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/docs");
  const validated = documentStateSchema.safeParse({
    documentId: formData.get("documentId"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "更新归档状态失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access?.canEdit) {
    return {
      ok: false,
      message: "你没有权限管理这个文档。",
    };
  }

  const nextArchived = !access.document.isArchived;

  await prisma.document.update({
    where: { id: validated.data.documentId },
    data: {
      isArchived: nextArchived,
      lastEditedById: user.id,
      ...(nextArchived
        ? {}
        : {
            updatedAt: new Date(),
          }),
    },
  });

  revalidatePath("/docs");
  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: nextArchived ? "文档已归档。" : "文档已恢复。",
  };
}

export async function touchDocumentAction(documentId: string) {
  const user = await requireUser();
  const access = await getDocumentAccess({
    documentId,
    userId: user.id,
  });

  if (!access?.canEdit) {
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      updatedAt: new Date(),
      lastEditedById: user.id,
    },
  });
}
