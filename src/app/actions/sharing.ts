'use server';

import { DocumentRole, ShareAccess } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  disableShareLinkSchema,
  inviteMemberSchema,
  shareLinkSchema,
  type FormState,
} from "@/lib/auth/validation";
import { getDocumentAccess } from "@/lib/documents";

export async function inviteDocumentMemberAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const validated = inviteMemberSchema.safeParse({
    documentId: formData.get("documentId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "添加成员失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access?.canShare) {
    return {
      ok: false,
      message: "只有文档所有者可以管理权限。",
    };
  }

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能管理成员。",
    };
  }

  const invitee = await prisma.user.findUnique({
    where: { email: validated.data.email },
  });

  if (!invitee) {
    return {
      ok: false,
      message: "该邮箱对应的用户尚未注册。",
    };
  }

  if (invitee.id === access.document.ownerId) {
    return {
      ok: false,
      message: "文档所有者已拥有全部权限。",
    };
  }

  await prisma.documentMember.upsert({
    where: {
      documentId_userId: {
        documentId: validated.data.documentId,
        userId: invitee.id,
      },
    },
    update: {
      role: validated.data.role as DocumentRole,
    },
    create: {
      documentId: validated.data.documentId,
      userId: invitee.id,
      role: validated.data.role as DocumentRole,
    },
  });

  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: "成员权限已更新。",
  };
}

export async function createShareLinkAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const validated = shareLinkSchema.safeParse({
    documentId: formData.get("documentId"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "创建分享链接失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access?.canShare) {
    return {
      ok: false,
      message: "只有文档所有者可以管理分享链接。",
    };
  }

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能创建分享链接。",
    };
  }

  await prisma.documentShareLink.updateMany({
    where: {
      documentId: validated.data.documentId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  if (validated.data.role === "disabled") {
    revalidatePath(`/docs/${validated.data.documentId}`);

    return {
      ok: true,
      message: "公开分享已关闭。",
      data: {
        role: "disabled",
      },
    };
  }

  const token = randomUUID().replaceAll("-", "");

  await prisma.documentShareLink.create({
    data: {
      documentId: validated.data.documentId,
      createdById: user.id,
      token,
      role: validated.data.role as ShareAccess,
    },
  });

  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: "分享链接已创建。",
    data: {
      token,
      role: validated.data.role,
    },
  };
}

export async function disableShareLinkAction(formData: FormData) {
  const user = await requireUser();
  const validated = disableShareLinkSchema.safeParse({
    documentId: formData.get("documentId"),
    linkId: formData.get("linkId"),
  });

  if (!validated.success) {
    return;
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access?.canShare) {
    return;
  }

  if (access.document.deletedAt) {
    return;
  }

  await prisma.documentShareLink.update({
    where: { id: validated.data.linkId },
    data: {
      isActive: false,
    },
  });

  revalidatePath(`/docs/${validated.data.documentId}`);
}

export async function disableShareLinkStateAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const validated = disableShareLinkSchema.safeParse({
    documentId: formData.get("documentId"),
    linkId: formData.get("linkId"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "关闭链接失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access?.canShare) {
    return {
      ok: false,
      message: "只有文档所有者可以管理分享链接。",
    };
  }

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能管理分享链接。",
    };
  }

  await prisma.documentShareLink.update({
    where: { id: validated.data.linkId },
    data: {
      isActive: false,
    },
  });

  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: "访问链接已关闭。",
  };
}
