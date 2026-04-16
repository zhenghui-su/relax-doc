'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import {
	createCommentSchema,
	deleteCommentSchema,
	toggleResolveCommentSchema,
	type FormState,
} from '@/lib/auth/validation';
import { recordDocumentActivity } from '@/lib/document-activity';
import { getDocumentAccess } from '@/lib/documents';
import { createUserNotifications } from '@/lib/notifications';

async function getDocumentRecipientIds(documentId: string) {
	const document = await prisma.document.findUnique({
		where: { id: documentId },
		select: {
			ownerId: true,
			members: {
				select: {
					userId: true,
				},
			},
		},
	});

	if (!document) {
		return [];
	}

	return [document.ownerId, ...document.members.map((member) => member.userId)];
}

async function getThreadParticipantIds(
	documentId: string,
	rootCommentId: string,
) {
	const comments = await prisma.documentComment.findMany({
		where: {
			documentId,
			OR: [{ id: rootCommentId }, { parentId: rootCommentId }],
		},
		select: {
			authorId: true,
		},
	});

	return comments.map((comment) => comment.authorId);
}

export async function createDocumentCommentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser();
	const validated = createCommentSchema.safeParse({
		documentId: formData.get('documentId'),
		parentId: formData.get('parentId'),
		quote: formData.get('quote'),
		content: formData.get('content'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '发表评论失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const access = await getDocumentAccess({
		documentId: validated.data.documentId,
		userId: user.id,
	});

	if (!access || access.source !== 'member') {
		return {
			ok: false,
			message: '你当前不能在该文档下发表评论',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的文档不能评论',
		};
	}

	let parentComment: {
		id: string;
		documentId: string;
		parentId: string | null;
		authorId: string;
	} | null = null;

	if (validated.data.parentId) {
		parentComment = await prisma.documentComment.findUnique({
			where: {
				id: validated.data.parentId,
			},
			select: {
				id: true,
				parentId: true,
				authorId: true,
				documentId: true,
			},
		});

		if (
			!parentComment ||
			parentComment.documentId !== validated.data.documentId
		) {
			return {
				ok: false,
				message: '回复的评论不存在',
			};
		}
	}

	const rootCommentId = parentComment?.parentId ?? parentComment?.id ?? null;
	const nextQuote = validated.data.quote?.trim()
		? validated.data.quote.trim()
		: null;
	const comment = await prisma.documentComment.create({
		data: {
			documentId: validated.data.documentId,
			authorId: user.id,
			content: validated.data.content,
			parentId: rootCommentId,
			quote: nextQuote,
		},
	});

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: 'commentAdded',
		metadata: {
			commentId: comment.id,
			parentId: rootCommentId,
			excerpt: validated.data.content.slice(0, 80),
		},
	});

	const recipientIds = rootCommentId
		? await getThreadParticipantIds(validated.data.documentId, rootCommentId)
		: await getDocumentRecipientIds(validated.data.documentId);

	await createUserNotifications({
		recipientIds,
		actorId: user.id,
		documentId: validated.data.documentId,
		commentId: comment.id,
		type: rootCommentId ? 'commentReply' : 'commentAdded',
		metadata: {
			excerpt: validated.data.content.slice(0, 120),
			parentId: rootCommentId,
		},
	});

	revalidatePath(`/docs/${validated.data.documentId}`);

	return {
		ok: true,
		message: '评论已发布',
	};
}

export async function deleteDocumentCommentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser();
	const validated = deleteCommentSchema.safeParse({
		documentId: formData.get('documentId'),
		commentId: formData.get('commentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '删除评论失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const access = await getDocumentAccess({
		documentId: validated.data.documentId,
		userId: user.id,
	});

	if (!access || access.source !== 'member') {
		return {
			ok: false,
			message: '你没有权限删除该评论',
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
			_count: {
				select: {
					replies: true,
				},
			},
		},
	});

	if (!comment || comment.documentId !== validated.data.documentId) {
		return {
			ok: false,
			message: '评论不存在',
		};
	}

	if (comment.authorId !== user.id) {
		return {
			ok: false,
			message: '只能删除自己的评论',
		};
	}

	if (comment._count.replies > 0) {
		return {
			ok: false,
			message: '已有回复的讨论不能直接删除',
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
		message: '评论已删除',
	};
}

export async function toggleResolveDocumentCommentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser();
	const validated = toggleResolveCommentSchema.safeParse({
		documentId: formData.get('documentId'),
		commentId: formData.get('commentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '更新讨论状态失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const access = await getDocumentAccess({
		documentId: validated.data.documentId,
		userId: user.id,
	});

	if (!access || access.source !== 'member') {
		return {
			ok: false,
			message: '你没有权限处理该讨论',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的文档不能更新讨论',
		};
	}

	const currentComment = await prisma.documentComment.findUnique({
		where: {
			id: validated.data.commentId,
		},
		select: {
			id: true,
			documentId: true,
			parentId: true,
		},
	});

	if (
		!currentComment ||
		currentComment.documentId !== validated.data.documentId
	) {
		return {
			ok: false,
			message: '讨论不存在',
		};
	}

	const rootCommentId = currentComment.parentId ?? currentComment.id;
	const rootComment = await prisma.documentComment.findUnique({
		where: {
			id: rootCommentId,
		},
		select: {
			id: true,
			resolvedAt: true,
		},
	});

	if (!rootComment) {
		return {
			ok: false,
			message: '讨论不存在',
		};
	}

	const nextResolved = !rootComment.resolvedAt;

	await prisma.documentComment.update({
		where: {
			id: rootComment.id,
		},
		data: {
			resolvedAt: nextResolved ? new Date() : null,
			resolvedById: nextResolved ? user.id : null,
		},
	});

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: nextResolved ? 'commentResolved' : 'commentReopened',
		metadata: {
			commentId: rootComment.id,
		},
	});

	await createUserNotifications({
		recipientIds: await getThreadParticipantIds(
			validated.data.documentId,
			rootComment.id,
		),
		actorId: user.id,
		documentId: validated.data.documentId,
		commentId: rootComment.id,
		type: nextResolved ? 'commentResolved' : 'commentReopened',
	});

	revalidatePath(`/docs/${validated.data.documentId}`);

	return {
		ok: true,
		message: nextResolved ? '讨论已解决' : '讨论已重新打开',
	};
}
