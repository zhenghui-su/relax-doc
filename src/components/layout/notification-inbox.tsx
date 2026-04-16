'use client';

import { message } from 'antd';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
	markAllNotificationsReadAction,
	markNotificationReadAction,
} from '@/app/actions/notifications';
import { ModalShell } from '@/components/ui/modal-shell';
import { formatRelativeTime } from '@/lib/time';
import { cn, nameFromEmail } from '@/lib/utils';

type NotificationInboxProps = {
	unreadCount: number;
	notifications: Array<{
		id: string;
		type:
			| 'documentInvited'
			| 'documentPermissionChanged'
			| 'documentRemoved'
			| 'commentAdded'
			| 'commentReply'
			| 'commentResolved'
			| 'commentReopened'
			| 'documentRestored'
			| 'documentTrashed'
			| 'versionRestored';
		isRead: boolean;
		createdAt: Date;
		metadata: Record<string, unknown> | null;
		actor: {
			id: string;
			name: string | null;
			email: string;
		} | null;
		document: {
			id: string;
			title: string;
		} | null;
		comment: {
			id: string;
			parentId: string | null;
			content: string;
		} | null;
	}>;
};

function BellIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M10 3.75a3.75 3.75 0 0 0-3.75 3.75v1.16c0 .62-.18 1.22-.52 1.75l-.76 1.18a1.25 1.25 0 0 0 1.05 1.93h7.96a1.25 1.25 0 0 0 1.05-1.93l-.76-1.18a3.2 3.2 0 0 1-.52-1.75V7.5A3.75 3.75 0 0 0 10 3.75ZM8 15.25a2 2 0 0 0 4 0'
				stroke='currentColor'
				strokeWidth='1.45'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function CloseIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='m6 6 8 8m0-8-8 8'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
			/>
		</svg>
	);
}

function actorLabel(
	actor: NotificationInboxProps['notifications'][number]['actor'],
) {
	if (!actor) {
		return '系统';
	}

	return actor.name?.trim() || nameFromEmail(actor.email);
}

function metadataLabel(metadata: Record<string, unknown> | null, key: string) {
	const value = metadata?.[key];

	return typeof value === 'string' && value.trim() ? value : null;
}

function getNotificationCopy(
	notification: NotificationInboxProps['notifications'][number],
) {
	const actor = actorLabel(notification.actor);
	const title = notification.document?.title || '该文档';
	const excerpt =
		metadataLabel(notification.metadata, 'excerpt') ||
		notification.comment?.content?.slice(0, 80) ||
		'';

	switch (notification.type) {
		case 'documentInvited':
			return {
				title: `${actor} 邀请你加入《${title}》`,
				description: '你现在可以在文档中进行协作',
			};
		case 'documentPermissionChanged':
			return {
				title: `${actor} 更新了你在《${title}》中的权限`,
				description: '打开文档查看最新可用权限',
			};
		case 'documentRemoved':
			return {
				title: `${actor} 移除了你对《${title}》的访问`,
				description: '该文档将不再出现在你的协作列表中',
			};
		case 'commentAdded':
			return {
				title: `${actor} 在《${title}》中发起了讨论`,
				description: excerpt || '有新的讨论需要查看',
			};
		case 'commentReply':
			return {
				title: `${actor} 回复了你关注的讨论`,
				description: excerpt || `来自《${title}》的新回复`,
			};
		case 'commentResolved':
			return {
				title: `${actor} 已解决一条讨论`,
				description: `文档《${title}》中的讨论状态已更新`,
			};
		case 'commentReopened':
			return {
				title: `${actor} 重新打开了一条讨论`,
				description: `文档《${title}》中的讨论重新进入处理中`,
			};
		case 'documentRestored':
			return {
				title: `${actor} 恢复了《${title}》`,
				description: '文档已重新回到正常协作空间',
			};
		case 'documentTrashed':
			return {
				title: `${actor} 将《${title}》移入回收站`,
				description: '文档已从主导航隐藏',
			};
		case 'versionRestored':
			return {
				title: `${actor} 恢复了《${title}》的历史版本`,
				description: '文档内容已切换到一个较早版本',
			};
		default:
			return {
				title: '有一条新的协作通知',
				description: title,
			};
	}
}

function getNotificationHref(
	notification: NotificationInboxProps['notifications'][number],
) {
	if (notification.type === 'documentRemoved') {
		return '/docs';
	}

	if (!notification.document?.id) {
		return '/docs';
	}

	if (notification.comment?.id) {
		return `/docs/${notification.document.id}?comment=${notification.comment.parentId ?? notification.comment.id}`;
	}

	return `/docs/${notification.document.id}`;
}

export function NotificationInbox({
	unreadCount,
	notifications,
}: NotificationInboxProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	function openInbox() {
		setOpen(true);
	}

	function markAllRead() {
		startTransition(async () => {
			const result = await markAllNotificationsReadAction();

			if (!result.ok) {
				message.error(result.message || '操作失败');
				return;
			}

			message.success(result.message || '操作已完成');
			router.refresh();
		});
	}

	function handleOpenNotification(
		notification: NotificationInboxProps['notifications'][number],
	) {
		startTransition(async () => {
			if (!notification.isRead) {
				const formData = new FormData();
				formData.set('notificationId', notification.id);
				const result = await markNotificationReadAction({}, formData);

				if (!result.ok) {
					message.error(result.message || '更新通知失败');
					return;
				}
			}

			setOpen(false);
			router.push(getNotificationHref(notification));
			router.refresh();
		});
	}

	return (
		<>
			<button
				type='button'
				onClick={openInbox}
				className='relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-black/[0.045] hover:text-foreground'
				aria-label='通知'
			>
				<BellIcon />
				{unreadCount > 0 ? (
					<span className='absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[#151515] px-1 text-[10px] font-semibold leading-4 text-white'>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				) : null}
			</button>

			{open ? (
				<ModalShell
					onClose={() => setOpen(false)}
					className='w-full max-w-[420px] rounded-[18px] border border-black/8 bg-white p-0 shadow-[0_20px_64px_rgba(15,23,42,0.14)]'
				>
					<div className='flex max-h-[min(78vh,720px)] flex-col overflow-hidden'>
						<div className='flex items-center justify-between gap-4 border-b border-black/6 px-4 py-3'>
							<div className='min-w-0'>
								<h2 className='text-base font-semibold text-foreground'>
									通知
								</h2>
								<p className='mt-0.5 text-xs text-muted'>
									{unreadCount > 0 ? `${unreadCount} 条未读` : '没有未读通知'}
								</p>
							</div>

							<div className='flex items-center gap-2'>
								{notifications.length > 0 ? (
									<button
										type='button'
										disabled={isPending || unreadCount === 0}
										onClick={markAllRead}
										className='inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
									>
										全部已读
									</button>
								) : null}
								<button
									type='button'
									onClick={() => setOpen(false)}
									className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-foreground'
									aria-label='关闭通知面板'
								>
									<CloseIcon />
								</button>
							</div>
						</div>

						<div className='min-h-0 overflow-y-auto px-3 py-3'>
							{notifications.length > 0 ? (
								<div className='space-y-2'>
									{notifications.map((notification) => {
										const copy = getNotificationCopy(notification);

										return (
											<button
												key={notification.id}
												type='button'
												onClick={() => handleOpenNotification(notification)}
												className={cn(
													'flex w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left transition hover:bg-[#f7f7f3]',
													notification.isRead ? 'bg-white' : 'bg-[#f7f7f3]',
												)}
											>
												<span
													className={cn(
														'mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
														notification.isRead
															? 'bg-black/12'
															: 'bg-[#151515]',
													)}
												/>

												<div className='min-w-0 flex-1'>
													<p className='text-sm font-medium leading-6 text-foreground'>
														{copy.title}
													</p>
													<p className='mt-0.5 text-sm leading-6 text-muted'>
														{copy.description}
													</p>
													<p className='mt-1.5 text-[11px] font-medium text-muted'>
														{formatRelativeTime(notification.createdAt)}
													</p>
												</div>
											</button>
										);
									})}
								</div>
							) : (
								<div className='flex min-h-[240px] items-center justify-center text-center'>
									<div>
										<p className='text-sm font-semibold text-foreground'>
											还没有通知
										</p>
										<p className='mt-1 text-sm text-muted'>
											成员变更、评论和恢复操作会出现在这里
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</ModalShell>
			) : null}
		</>
	);
}
