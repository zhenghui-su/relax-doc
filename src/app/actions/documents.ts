'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import {
	createDocumentSchema,
	documentStateSchema,
	moveDocumentSchema,
	restoreVersionSchema,
	updateDocumentTitleSchema,
	type FormState,
} from '@/lib/auth/validation';
import { recordDocumentActivity } from '@/lib/document-activity';
import { createDocumentVersionSnapshot } from '@/lib/document-versions';
import { getDocumentAccess } from '@/lib/documents';
import { createUserNotifications } from '@/lib/notifications';

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
	revalidatePath('/docs');
	revalidatePath(`/docs/${documentId}`);
}

async function getDocumentCollaboratorIds(documentId: string) {
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

async function getDocumentParentChainParentIds(documentId: string) {
	const parentIds = new Set<string>();
	let currentId: string | null = documentId;
	let guard = 0;

	while (currentId && guard < 40) {
		const current: { parentId: string | null } | null =
			await prisma.document.findUnique({
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

async function hasCreatableParentAccess(options: {
	parentId: string | null;
	userId: string;
}) {
	const { parentId, userId } = options;

	if (!parentId) {
		return true;
	}

	const parentAccess = await getDocumentAccess({
		documentId: parentId,
		userId,
	});

	return Boolean(
		parentAccess?.canEdit &&
		!parentAccess.document.deletedAt &&
		!parentAccess.document.isArchived,
	);
}

async function createDocumentRecord(options: {
	userId: string;
	title: string;
	parentId: string | null;
}) {
	const { userId, title, parentId } = options;

	return prisma.document.create({
		data: {
			title,
			owner: {
				connect: {
					id: userId,
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
			...lastEditedByRelation(userId),
		},
	});
}

export async function createDocumentAction(formData: FormData) {
	const user = await requireUser('/docs');
	const validated = createDocumentSchema.safeParse({
		title: formData.get('title'),
		parentId: formData.get('parentId'),
	});

	const title = validated.success ? validated.data.title : '未命名文档';
	const parentId =
		validated.success && validated.data.parentId
			? validated.data.parentId
			: null;

	const hasParentAccess = await hasCreatableParentAccess({
		parentId,
		userId: user.id,
	});

	if (!hasParentAccess) {
		redirect('/docs');
	}

	const document = await createDocumentRecord({
		userId: user.id,
		title,
		parentId,
	});

	await recordDocumentActivity({
		documentId: document.id,
		actorId: user.id,
		type: 'created',
		metadata: {
			title: document.title,
			parentId,
		},
	});

	await createDocumentVersionSnapshot({
		documentId: document.id,
		createdById: user.id,
		source: 'system',
		metadata: {
			reason: 'created',
		},
	});

	revalidateDocumentViews(document.id);
	redirect(`/docs/${document.id}`);
}

export async function quickCreateDocumentAction(input: {
	title?: string;
	parentId?: string | null;
}): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = createDocumentSchema.safeParse({
		title: input.title,
		parentId: input.parentId ?? '',
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '创建文档失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const parentId = validated.data.parentId || null;
	const hasParentAccess = await hasCreatableParentAccess({
		parentId,
		userId: user.id,
	});

	if (!hasParentAccess) {
		return {
			ok: false,
			message: '你没有权限在该页面下创建文档',
		};
	}

	const document = await createDocumentRecord({
		userId: user.id,
		title: validated.data.title,
		parentId,
	});

	await recordDocumentActivity({
		documentId: document.id,
		actorId: user.id,
		type: 'created',
		metadata: {
			title: document.title,
			parentId,
		},
	});

	await createDocumentVersionSnapshot({
		documentId: document.id,
		createdById: user.id,
		source: 'system',
		metadata: {
			reason: 'created',
		},
	});

	await revalidateDocumentViews(document.id);
	if (parentId) {
		revalidatePath(`/docs/${parentId}`);
	}

	return {
		ok: true,
		message: parentId ? '子页面已创建' : '文档已创建',
		data: {
			documentId: document.id,
			title: document.title,
		},
	};
}

export async function updateDocumentTitleAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser();
	const validated = updateDocumentTitleSchema.safeParse({
		documentId: formData.get('documentId'),
		title: formData.get('title'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '更新标题失败',
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
			message: '你没有权限修改文档标题',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的文档不能编辑',
		};
	}

	await prisma.document.update({
		where: { id: validated.data.documentId },
		data: {
			title: validated.data.title,
			...lastEditedByRelation(user.id),
		},
	});

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: 'renamed',
		metadata: {
			title: validated.data.title,
		},
	});

	await createDocumentVersionSnapshot({
		documentId: validated.data.documentId,
		createdById: user.id,
		source: 'rename',
		metadata: {
			title: validated.data.title,
		},
	});

	await revalidateDocumentViews(validated.data.documentId);

	return {
		ok: true,
		message: '标题已更新',
	};
}

export async function toggleFavoriteDocumentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = documentStateSchema.safeParse({
		documentId: formData.get('documentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '更新收藏失败',
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
			message: '文档不存在或你无权访问',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的文档不能收藏',
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
		message: existingFavorite ? '已取消收藏' : '已加入收藏',
	};
}

export async function toggleArchiveDocumentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = documentStateSchema.safeParse({
		documentId: formData.get('documentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '更新归档状态失败',
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
			message: '你没有权限管理这个文档',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的文档不能归档',
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

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: nextArchived ? 'archived' : 'restored',
	});

	await revalidateDocumentViews(validated.data.documentId);

	return {
		ok: true,
		message: nextArchived ? '文档已归档' : '文档已恢复',
	};
}

export async function moveDocumentToTrashAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = documentStateSchema.safeParse({
		documentId: formData.get('documentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '移动到回收站失败',
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
			message: '你没有权限删除这个文档',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: true,
			message: '文档已在回收站中',
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

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: 'trashed',
	});

	await createUserNotifications({
		recipientIds: await getDocumentCollaboratorIds(validated.data.documentId),
		actorId: user.id,
		documentId: validated.data.documentId,
		type: 'documentTrashed',
	});

	await revalidateDocumentViews(validated.data.documentId);

	return {
		ok: true,
		message: '已移入回收站',
	};
}

export async function restoreDocumentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = documentStateSchema.safeParse({
		documentId: formData.get('documentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '恢复文档失败',
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
			message: '你没有权限恢复这个文档',
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

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: 'restored',
	});

	await createUserNotifications({
		recipientIds: await getDocumentCollaboratorIds(validated.data.documentId),
		actorId: user.id,
		documentId: validated.data.documentId,
		type: 'documentRestored',
	});

	await revalidateDocumentViews(validated.data.documentId);

	return {
		ok: true,
		message: '文档已恢复',
	};
}

export async function permanentlyDeleteDocumentAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = documentStateSchema.safeParse({
		documentId: formData.get('documentId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '彻底删除失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const access = await getDocumentAccess({
		documentId: validated.data.documentId,
		userId: user.id,
	});

	if (access?.role !== 'owner') {
		return {
			ok: false,
			message: '只有所有者可以彻底删除文档',
		};
	}

	await prisma.document.delete({
		where: { id: validated.data.documentId },
	});

	revalidatePath('/docs');

	return {
		ok: true,
		message: '文档已彻底删除',
	};
}

export async function moveDocumentAction(input: {
	documentId: string;
	parentId: string | null;
}): Promise<FormState> {
	const user = await requireUser('/docs');
	const validated = moveDocumentSchema.safeParse(input);

	if (!validated.success) {
		return {
			ok: false,
			message: '移动页面失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	const { documentId, parentId } = validated.data;

	if (documentId === parentId) {
		return {
			ok: false,
			message: '不能把页面移动到自己下面',
		};
	}

	const access = await getDocumentAccess({
		documentId,
		userId: user.id,
	});

	if (!access?.canEdit) {
		return {
			ok: false,
			message: '你没有权限移动这个页面',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的页面不能调整层级',
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
				message: '你没有权限移动到该父页面',
			};
		}

		if (parentAccess.document.deletedAt) {
			return {
				ok: false,
				message: '不能移动到回收站中的页面',
			};
		}

		if (parentAccess.document.isArchived) {
			return {
				ok: false,
				message: '不能移动到已归档页面下面',
			};
		}

		const ancestorIds = await getDocumentParentChainParentIds(parentId);

		if (ancestorIds.has(documentId)) {
			return {
				ok: false,
				message: '不能把页面移动到自己的子页面下面',
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

	await recordDocumentActivity({
		documentId,
		actorId: user.id,
		type: 'moved',
		metadata: {
			parentId,
		},
	});

	await revalidateDocumentViews(documentId);
	if (parentId) {
		revalidatePath(`/docs/${parentId}`);
	}

	return {
		ok: true,
		message: parentId ? '页面层级已更新' : '页面已移动到根层级',
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

export async function restoreDocumentVersionAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser();
	const validated = restoreVersionSchema.safeParse({
		documentId: formData.get('documentId'),
		versionId: formData.get('versionId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '恢复版本失败',
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
			message: '你没有权限恢复该版本',
		};
	}

	if (access.document.deletedAt) {
		return {
			ok: false,
			message: '回收站中的文档不能恢复版本',
		};
	}

	const version = await prisma.documentVersion.findUnique({
		where: {
			id: validated.data.versionId,
		},
		select: {
			id: true,
			documentId: true,
			title: true,
			ydocState: true,
			createdAt: true,
		},
	});

	if (!version || version.documentId !== validated.data.documentId) {
		return {
			ok: false,
			message: '历史版本不存在',
		};
	}

	await createDocumentVersionSnapshot({
		documentId: validated.data.documentId,
		createdById: user.id,
		source: 'system',
		metadata: {
			reason: 'before-restore',
			targetVersionId: version.id,
		},
		dedupeLatest: true,
	});

	await prisma.document.update({
		where: {
			id: validated.data.documentId,
		},
		data: {
			title: version.title,
			ydocState: version.ydocState ?? null,
			updatedAt: new Date(),
			...lastEditedByRelation(user.id),
		},
	});

	await recordDocumentActivity({
		documentId: validated.data.documentId,
		actorId: user.id,
		type: 'versionRestored',
		metadata: {
			versionId: version.id,
			title: version.title,
		},
	});

	await createUserNotifications({
		recipientIds: await getDocumentCollaboratorIds(validated.data.documentId),
		actorId: user.id,
		documentId: validated.data.documentId,
		type: 'versionRestored',
		metadata: {
			versionId: version.id,
			title: version.title,
		},
	});

	await revalidateDocumentViews(validated.data.documentId);

	return {
		ok: true,
		message: '已恢复到所选版本',
	};
}
