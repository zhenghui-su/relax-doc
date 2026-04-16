'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { notificationStateSchema, type FormState } from '@/lib/auth/validation';

export async function markNotificationReadAction(
	_previousState: FormState,
	formData: FormData,
): Promise<FormState> {
	const user = await requireUser();
	const validated = notificationStateSchema.safeParse({
		notificationId: formData.get('notificationId'),
	});

	if (!validated.success) {
		return {
			ok: false,
			message: '更新通知失败',
			errors: validated.error.flatten().fieldErrors,
		};
	}

	await prisma.userNotification.updateMany({
		where: {
			id: validated.data.notificationId,
			userId: user.id,
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	revalidatePath('/docs');

	return {
		ok: true,
		message: '通知已读',
	};
}

export async function markAllNotificationsReadAction(): Promise<FormState> {
	const user = await requireUser();

	await prisma.userNotification.updateMany({
		where: {
			userId: user.id,
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	revalidatePath('/docs');

	return {
		ok: true,
		message: '已全部标记为已读',
	};
}
