'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  createCommentSchema,
  deleteCommentSchema,
  type FormState,
} from "@/lib/auth/validation";
import { getDocumentAccess } from "@/lib/documents";

export async function createDocumentCommentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const validated = createCommentSchema.safeParse({
    documentId: formData.get("documentId"),
    content: formData.get("content"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "发表评论失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access || access.source !== "member") {
    return {
      ok: false,
      message: "你当前不能在该文档下发表评论。",
    };
  }

  if (access.document.deletedAt) {
    return {
      ok: false,
      message: "回收站中的文档不能评论。",
    };
  }

  await prisma.documentComment.create({
    data: {
      documentId: validated.data.documentId,
      authorId: user.id,
      content: validated.data.content,
    },
  });

  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: "评论已发布。",
  };
}

export async function deleteDocumentCommentAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const validated = deleteCommentSchema.safeParse({
    documentId: formData.get("documentId"),
    commentId: formData.get("commentId"),
  });

  if (!validated.success) {
    return {
      ok: false,
      message: "删除评论失败。",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const access = await getDocumentAccess({
    documentId: validated.data.documentId,
    userId: user.id,
  });

  if (!access || access.source !== "member") {
    return {
      ok: false,
      message: "你没有权限删除该评论。",
    };
  }

  const comment = await prisma.documentComment.findUnique({
    where: {
      id: validated.data.commentId,
    },
    select: {
      id: true,
      documentId: true,
      authorId: true,
    },
  });

  if (!comment || comment.documentId !== validated.data.documentId) {
    return {
      ok: false,
      message: "评论不存在。",
    };
  }

  if (comment.authorId !== user.id) {
    return {
      ok: false,
      message: "只能删除自己的评论。",
    };
  }

  await prisma.documentComment.delete({
    where: {
      id: validated.data.commentId,
    },
  });

  revalidatePath(`/docs/${validated.data.documentId}`);

  return {
    ok: true,
    message: "评论已删除。",
  };
}
