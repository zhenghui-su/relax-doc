'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  createDocumentSchema,
  documentStateSchema,
  moveDocumentSchema,
  updateDocumentTitleSchema,
  type FormState,
} from "@/lib/auth/validation";
import { getDocumentAccess } from "@/lib/documents";

function lastEditedByRelation(userId: string) {
  return {
    lastEditedBy: {
      connect: {
        id: userId,
      },
    },
  };
}

async function revalidateDocumentViews(documentId: string) {
  revalidatePath("/docs");
  revalidatePath(`/docs/${documentId}`);
}

async function getDocumentParentChainParentIds(documentId: string) {
  const parentIds = new Set<string>();
  let currentId: string | null = documentId;
  let guard = 0;

  while (currentId && guard < 40) {
    const current: { parentId: string | null } | null = await prisma.document.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    const parentId: string | null = current?.parentId ?? null;

    if (!parentId || parentIds.has(parentId)) {
      break;
    }

    parentIds.add(parentId);
    currentId = parentId;
    guard += 1;
  }

  return parentIds;
}

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

    if (!parentAccess?.canEdit || parentAccess.document.deletedAt || parentAccess.document.isArchived) {
      redirect("/docs");
    }
  }

  const document = await prisma.document.create({
    data: {
      title,
      owner: {
        connect: {
          id: user.id,
        },
      },
      ...(parentId
        ? {
            parent: {
              connect: {
                id: parentId,
              },
            },
          }
        : {}),
      ...lastEditedByRelation(user.id),
    },
  });

  revalidateDocumentViews(document.id);
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

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能编辑。",
    };
  }

  await prisma.document.update({
    where: { id: validated.data.documentId },
    data: {
      title: validated.data.title,
      ...lastEditedByRelation(user.id),
    },
  });

  await revalidateDocumentViews(validated.data.documentId);

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

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能收藏。",
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

  await revalidateDocumentViews(validated.data.documentId);

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

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能归档。",
    };
  }

  const nextArchived = !access.document.isArchived;

  await prisma.document.update({
    where: { id: validated.data.documentId },
    data: {
      isArchived: nextArchived,
      ...lastEditedByRelation(user.id),
      ...(nextArchived
        ? {}
        : {
            deletedAt: null,
          }),
      ...(nextArchived
        ? {}
        : {
            updatedAt: new Date(),
          }),
    },
  });

  await revalidateDocumentViews(validated.data.documentId);

  return {
    ok: true,
    message: nextArchived ? "文档已归档。" : "文档已恢复。",
  };
}

export async function moveDocumentToTrashAction(
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
      message: "移动到回收站失败。",
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
      message: "你没有权限删除这个文档。",
    };
  }

  if (access.document.deletedAt) {
    return {
      ok: true,
      message: "文档已在回收站中。",
    };
  }

  await prisma.document.update({
    where: { id: validated.data.documentId },
    data: {
      deletedAt: new Date(),
      isArchived: false,
      ...lastEditedByRelation(user.id),
    },
  });

  await revalidateDocumentViews(validated.data.documentId);

  return {
    ok: true,
    message: "已移入回收站。",
  };
}

export async function restoreDocumentAction(
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
      message: "恢复文档失败。",
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
      message: "你没有权限恢复这个文档。",
    };
  }

  await prisma.document.update({
    where: { id: validated.data.documentId },
    data: {
      deletedAt: null,
      ...lastEditedByRelation(user.id),
      updatedAt: new Date(),
    },
  });

  await revalidateDocumentViews(validated.data.documentId);

  return {
    ok: true,
    message: "文档已恢复。",
  };
}

export async function permanentlyDeleteDocumentAction(
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
      message: "彻底删除失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (access?.role !== "owner") {
    return {
      ok: false,
      message: "只有所有者可以彻底删除文档。",
    };
  }

  await prisma.document.delete({
    where: { id: validated.data.documentId },
  });

  revalidatePath("/docs");

  return {
    ok: true,
    message: "文档已彻底删除。",
  };
}

export async function moveDocumentAction(input: {
  documentId: string;
  parentId: string | null;
}): Promise<FormState> {
  const user = await requireUser("/docs");
  const validated = moveDocumentSchema.safeParse(input);

  if (!validated.success) {
    return {
      ok: false,
      message: "移动页面失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { documentId, parentId } = validated.data;

  if (documentId === parentId) {
    return {
      ok: false,
      message: "不能把页面移动到自己下面。",
    };
  }

  const access = await getDocumentAccess({
    documentId,
    userId: user.id,
  });

  if (!access?.canEdit) {
    return {
      ok: false,
      message: "你没有权限移动这个页面。",
    };
  }

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的页面不能调整层级。",
    };
  }

  if (parentId) {
    const parentAccess = await getDocumentAccess({
      documentId: parentId,
      userId: user.id,
    });

    if (!parentAccess?.canEdit) {
      return {
        ok: false,
        message: "你没有权限移动到该父页面。",
      };
    }

    if (parentAccess.document.deletedAt) {
      return {
        ok: false,
        message: "不能移动到回收站中的页面。",
      };
    }

    if (parentAccess.document.isArchived) {
      return {
        ok: false,
        message: "不能移动到已归档页面下面。",
      };
    }

    const ancestorIds = await getDocumentParentChainParentIds(parentId);

    if (ancestorIds.has(documentId)) {
      return {
        ok: false,
        message: "不能把页面移动到自己的子页面下面。",
      };
    }
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(parentId
        ? {
            parent: {
              connect: {
                id: parentId,
              },
            },
          }
        : {
            parent: {
              disconnect: true,
            },
          }),
      ...lastEditedByRelation(user.id),
      updatedAt: new Date(),
    },
  });

  await revalidateDocumentViews(documentId);
  if (parentId) {
    revalidatePath(`/docs/${parentId}`);
  }

  return {
    ok: true,
    message: parentId ? "页面层级已更新。" : "页面已移动到根层级。",
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

  if (access.document.deletedAt) {
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      updatedAt: new Date(),
      ...lastEditedByRelation(user.id),
    },
  });
}
