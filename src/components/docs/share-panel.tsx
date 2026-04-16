'use client';

import { type ShareAccess } from '@prisma/client';
import { message, Popconfirm, Segmented, Select } from 'antd';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
	createShareLinkAction,
	inviteDocumentMemberAction,
	removeDocumentMemberAction,
	updateDocumentMemberRoleAction,
} from '@/app/actions/sharing';
import { ModalShell } from '@/components/ui/modal-shell';
import { formatRelativeTime } from '@/lib/time';
import { cn, nameFromEmail, roleLabel, userColorFromString } from '@/lib/utils';

type ShareMode = ShareAccess | 'disabled';

type SharePanelProps = {
	documentId: string;
	appUrl: string;
	canManage: boolean;
	owner: {
		id: string;
		name: string | null;
		email: string;
	};
	members: Array<{
		id: string;
		role: 'owner' | 'editor' | 'viewer';
		user: {
			id: string;
			name: string | null;
			email: string;
		};
	}>;
	inviteCandidates: Array<{
		id: string;
		name: string | null;
		email: string;
	}>;
	shareLinks: Array<{
		id: string;
		token: string;
		role: ShareAccess;
		isActive: boolean;
	}>;
	activities: Array<{
		id: string;
		type:
			| 'created'
			| 'renamed'
			| 'archived'
			| 'restored'
			| 'trashed'
			| 'moved'
			| 'memberInvited'
			| 'memberRoleChanged'
			| 'memberRemoved'
			| 'shareEnabled'
			| 'shareDisabled'
			| 'commentAdded'
			| 'commentResolved'
			| 'commentReopened'
			| 'versionRestored';
		createdAt: Date;
		metadata: Record<string, unknown> | null;
		actor: {
			id: string;
			name: string | null;
			email: string;
		} | null;
	}>;
};

const shareOptions: Array<{
	value: ShareMode;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
}> = [
	{
		value: 'disabled',
		label: '关闭外链',
		shortLabel: '关闭',
		icon: (
			<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
				<path
					d='M5.75 5.75 14.25 14.25M14.25 5.75 5.75 14.25'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
				/>
			</svg>
		),
	},
	{
		value: 'viewer',
		label: '仅查看',
		shortLabel: '查看',
		icon: (
			<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
				<path
					d='M2.75 10s2.5-4.25 7.25-4.25S17.25 10 17.25 10 14.75 14.25 10 14.25 2.75 10 2.75 10Z'
					stroke='currentColor'
					strokeWidth='1.45'
					strokeLinejoin='round'
				/>
				<circle
					cx='10'
					cy='10'
					r='2.25'
					stroke='currentColor'
					strokeWidth='1.45'
				/>
			</svg>
		),
	},
	{
		value: 'editor',
		label: '可编辑',
		shortLabel: '编辑',
		icon: (
			<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
				<path
					d='m12.25 4.75 3 3M5 15l2.4-.45a1 1 0 0 0 .52-.28l6.38-6.37a1 1 0 0 0 0-1.42l-1.88-1.88a1 1 0 0 0-1.42 0L4.62 10.97a1 1 0 0 0-.28.52L3.9 13.9A.85.85 0 0 0 5 15Z'
					stroke='currentColor'
					strokeWidth='1.45'
					strokeLinejoin='round'
				/>
			</svg>
		),
	},
];

function ShareIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M13.75 6.25a2.25 2.25 0 1 0-2.05-3.18L7.9 5.24a2.25 2.25 0 0 0 0 4.52l3.8 2.17a2.25 2.25 0 1 0 .7-1.22L8.6 8.54a2.26 2.26 0 0 0 0-1.08l3.8-2.17c.38.58 1.03.96 1.75.96Z'
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

function HistoryIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M10 4.5a5.5 5.5 0 1 1-5.2 7.3M5 6v4h4M10 7.25v3l2.1 1.35'
				stroke='currentColor'
				strokeWidth='1.45'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function CopyIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M7.25 6.25V5a1 1 0 0 1 1-1h6.25a1 1 0 0 1 1 1v8.75a1 1 0 0 1-1 1H8.25a1 1 0 0 1-1-1v-1.25M5.5 7.25h6.25a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8.25a1 1 0 0 1 1-1Z'
				stroke='currentColor'
				strokeWidth='1.45'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function ChevronIcon({ open = false }: { open?: boolean }) {
	return (
		<svg
			viewBox='0 0 20 20'
			fill='none'
			className={cn('h-4 w-4 transition', open ? 'rotate-180' : '')}
		>
			<path
				d='m5.75 7.75 4.25 4.5 4.25-4.5'
				stroke='currentColor'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function getInitial(name: string | null, email: string) {
	return Array.from((name?.trim() || email).trim())[0]?.toUpperCase() ?? '?';
}

function actorLabel(actor: { name: string | null; email: string } | null) {
	if (!actor) {
		return '未知成员';
	}

	return actor.name?.trim() || nameFromEmail(actor.email);
}

function metadataLabel(value: unknown) {
	return typeof value === 'string' && value.trim() ? value : null;
}

function describeActivity(activity: SharePanelProps['activities'][number]) {
	const actor = actorLabel(activity.actor);
	const metadata = activity.metadata ?? {};
	const targetLabel = metadataLabel(metadata.targetUserLabel);
	const role = metadataLabel(metadata.role);
	const title = metadataLabel(metadata.title);

	switch (activity.type) {
		case 'created':
			return `${actor} 创建了文档`;
		case 'renamed':
			return `${actor} 将标题更新为“${title || '未命名文档'}”`;
		case 'archived':
			return `${actor} 归档了文档`;
		case 'restored':
			return `${actor} 恢复了文档`;
		case 'trashed':
			return `${actor} 将文档移入回收站`;
		case 'moved':
			return `${actor} 调整了页面层级`;
		case 'memberInvited':
			return `${actor} 邀请 ${targetLabel || '新成员'} 加入文档`;
		case 'memberRoleChanged':
			return `${actor} 将 ${targetLabel || '成员'} 的权限改为 ${roleLabel((role as 'editor' | 'viewer') || 'viewer')}`;
		case 'memberRemoved':
			return `${actor} 移除了 ${targetLabel || '成员'}`;
		case 'shareEnabled':
			return `${actor} 开启了${role === 'editor' ? '可编辑' : '只读'}外链`;
		case 'shareDisabled':
			return `${actor} 关闭了公开分享`;
		case 'commentAdded':
			return `${actor} 发起了一条讨论`;
		case 'commentResolved':
			return `${actor} 解决了一条讨论`;
		case 'commentReopened':
			return `${actor} 重新打开了一条讨论`;
		case 'versionRestored':
			return `${actor} 恢复了一个历史版本`;
		default:
			return `${actor} 更新了文档`;
	}
}

function CollaboratorAvatar({
	name,
	email,
}: {
	name: string | null;
	email: string;
}) {
	const initial = getInitial(name, email);

	return (
		<span
			className='inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white'
			style={{ backgroundColor: userColorFromString(email) }}
		>
			{initial}
		</span>
	);
}

function MemberRow({
	documentId,
	member,
	canManage,
	onRoleChange,
	onRemove,
	pending,
}: {
	documentId: string;
	member: SharePanelProps['members'][number];
	canManage: boolean;
	onRoleChange: (input: {
		documentId: string;
		memberId: string;
		role: 'editor' | 'viewer';
	}) => void;
	onRemove: (input: { documentId: string; memberId: string }) => void;
	pending: boolean;
}) {
	return (
		<div className='group/member flex flex-col gap-2 border-b border-black/6 py-3 last:border-b-0'>
			<div className='flex items-center justify-between gap-3'>
				<div className='flex min-w-0 flex-1 items-center gap-3'>
					<CollaboratorAvatar
						name={member.user.name}
						email={member.user.email}
					/>
					<div className='min-w-0 flex-1'>
						<div className='flex flex-wrap items-center gap-2'>
							<p className='truncate text-sm font-medium text-foreground'>
								{member.user.name?.trim() || nameFromEmail(member.user.email)}
							</p>
							<span className='inline-flex rounded-full bg-[#f4f4f1] px-2 py-0.5 text-[11px] font-semibold text-muted'>
								{member.role === 'owner' ? '所有者' : roleLabel(member.role)}
							</span>
						</div>
						<p className='mt-1 truncate text-xs text-muted'>
							{member.user.email}
						</p>
					</div>
				</div>

				{canManage && member.role !== 'owner' ? (
					<div className='flex shrink-0 items-center gap-1.5 opacity-70 transition group-hover/member:opacity-100'>
						<Select
							value={member.role}
							disabled={pending}
							size='small'
							popupMatchSelectWidth={false}
							className='share-modal-select share-modal-select-compact min-w-[96px]'
							options={[
								{ value: 'editor', label: '可编辑' },
								{ value: 'viewer', label: '只读' },
							]}
							onChange={(role) => {
								if (role === member.role) {
									return;
								}

								onRoleChange({
									documentId,
									memberId: member.user.id,
									role: role as 'editor' | 'viewer',
								});
							}}
						/>

						<Popconfirm
							title='移除成员'
							description='移除后该成员将失去当前文档访问权限'
							okText='移除'
							cancelText='取消'
							placement='bottomRight'
							onConfirm={() =>
								onRemove({ documentId, memberId: member.user.id })
							}
							disabled={pending}
						>
							<button
								type='button'
								disabled={pending}
								className='inline-flex h-7 min-w-[54px] items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-medium text-muted transition hover:bg-[#fff1ee] hover:text-[#b94728] disabled:cursor-not-allowed disabled:opacity-60'
							>
								移除
							</button>
						</Popconfirm>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function SharePanel({
	documentId,
	appUrl,
	canManage,
	owner,
	members,
	inviteCandidates,
	shareLinks,
	activities,
}: SharePanelProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [shareMode, setShareMode] = useState<ShareMode>(() => {
		return shareLinks.find((link) => link.isActive)?.role ?? 'disabled';
	});
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
	const [showActivity, setShowActivity] = useState(false);
	const [isSharePending, startShareTransition] = useTransition();
	const [isInvitePending, startInviteTransition] = useTransition();
	const [isMemberPending, startMemberTransition] = useTransition();

	const activeLink = useMemo(() => {
		return shareLinks.find((link) => link.isActive) ?? null;
	}, [shareLinks]);

	const activeRole = activeLink?.role ?? 'disabled';
	const activeLinkUrl = activeLink
		? `${appUrl}/share/${activeLink.token}`
		: null;
	const inviteCandidateOptions = useMemo(() => {
		return inviteCandidates.map((candidate) => ({
			value: candidate.email,
			label: candidate.name?.trim() || nameFromEmail(candidate.email),
			description: candidate.email,
		}));
	}, [inviteCandidates]);
	const inviteRoleOptions = useMemo(() => {
		return [
			{
				value: 'editor',
				label: '编辑',
			},
			{
				value: 'viewer',
				label: '只读',
			},
		];
	}, []);
	const selectedInviteCandidate = useMemo(() => {
		return (
			inviteCandidates.find((candidate) => candidate.email === inviteEmail) ??
			null
		);
	}, [inviteCandidates, inviteEmail]);
	const allMembers = useMemo(() => {
		return [
			{
				id: `owner-${owner.id}`,
				role: 'owner' as const,
				user: owner,
			},
			...members,
		];
	}, [members, owner]);

	async function refreshWithMessage(result: {
		ok?: boolean;
		message?: string;
		data?: Record<string, string | boolean | undefined>;
	}) {
		if (!result.ok) {
			message.error(result.message || '操作失败');
			return false;
		}

		message.success(result.message || '操作已完成');
		router.refresh();
		return true;
	}

	function handleShareSubmit() {
		startShareTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', documentId);
			formData.set('role', shareMode);

			const result = await createShareLinkAction({}, formData);
			const ok = await refreshWithMessage(result);

			if (!ok) {
				return;
			}

			const token = result.data?.token;

			if (typeof token === 'string') {
				const href = `${appUrl}/share/${token}`;

				try {
					await navigator.clipboard.writeText(href);
					message.success('分享链接已复制到剪贴板');
				} catch {
					message.error('链接已生成，但自动复制失败');
				}
			}

			setOpen(false);
		});
	}

	function handleInviteSubmit() {
		startInviteTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', documentId);
			formData.set('email', inviteEmail);
			formData.set('role', inviteRole);

			const result = await inviteDocumentMemberAction({}, formData);
			const ok = await refreshWithMessage(result);

			if (!ok) {
				return;
			}

			setInviteEmail('');
		});
	}

	function handleRoleChange(input: {
		documentId: string;
		memberId: string;
		role: 'editor' | 'viewer';
	}) {
		startMemberTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', input.documentId);
			formData.set('memberId', input.memberId);
			formData.set('role', input.role);
			const result = await updateDocumentMemberRoleAction({}, formData);
			await refreshWithMessage(result);
		});
	}

	function handleRemove(input: { documentId: string; memberId: string }) {
		startMemberTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', input.documentId);
			formData.set('memberId', input.memberId);
			const result = await removeDocumentMemberAction({}, formData);
			await refreshWithMessage(result);
		});
	}

	async function copyCurrentLink() {
		if (!activeLink) {
			message.error('当前没有可用的公开链接');
			return;
		}

		const href = `${appUrl}/share/${activeLink.token}`;
		try {
			await navigator.clipboard.writeText(href);
			message.success('分享链接已复制');
		} catch {
			message.error('复制失败，请稍后重试');
		}
	}

	function openModal() {
		setShareMode(activeRole);
		setShowActivity(false);
		setInviteEmail('');
		setOpen(true);
	}

	return (
		<>
			<button
				type='button'
				onClick={openModal}
				className='inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6'
			>
				<ShareIcon />
				协作
			</button>

			{open ? (
				<ModalShell
					onClose={() => setOpen(false)}
					className='w-full max-w-[560px] rounded-[18px] border border-black/8 bg-white p-0 shadow-[0_20px_64px_rgba(15,23,42,0.14)]'
				>
					<div className='flex max-h-[min(82vh,720px)] flex-col overflow-hidden'>
						<div className='flex items-center justify-between gap-4 border-b border-black/6 px-4 py-3'>
							<div className='min-w-0'>
								<h2 className='text-base font-semibold text-foreground'>
									协作
								</h2>
							</div>
							<button
								type='button'
								onClick={() => setOpen(false)}
								className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-foreground'
								aria-label='关闭协作面板'
							>
								<CloseIcon />
							</button>
						</div>

						<div className='min-h-0 overflow-y-auto px-4 py-4'>
							<div className='space-y-3.5'>
								<section className='rounded-[14px] border border-black/6 bg-[#fafaf8] p-3.5'>
									<div className='flex items-center justify-between gap-3'>
										<div className='min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1'>
											<p className='text-sm font-semibold text-foreground'>
												公开访问
											</p>
											<p className='text-xs text-muted'>
												{activeRole === 'disabled'
													? '仅成员可访问'
													: `当前外链为${activeRole === 'editor' ? '可编辑' : '仅查看'}`}
											</p>
										</div>
										{activeLinkUrl ? (
											<button
												type='button'
												onClick={() => void copyCurrentLink()}
												className='inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-white px-2.5 text-sm font-medium text-foreground ring-1 ring-black/6 transition hover:bg-[#f3f3ef]'
											>
												<CopyIcon />
												复制
											</button>
										) : null}
									</div>

									<Segmented<ShareMode>
										value={shareMode}
										onChange={(value) => setShareMode(value)}
										className='share-modal-segmented w-full'
										options={shareOptions.map((option) => ({
											value: option.value,
											label: option.shortLabel,
											icon: option.icon,
											tooltip: option.label,
										}))}
									/>

									<div className='mt-3 flex items-center justify-between gap-3'>
										<p className='text-xs text-muted'>
											{shareMode === 'disabled'
												? '关闭后立即失效'
												: '保存后自动复制'}
										</p>
										{canManage ? (
											<button
												type='button'
												disabled={isSharePending}
												onClick={handleShareSubmit}
												className='inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-[#151515] px-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/30'
											>
												{isSharePending
													? '保存中'
													: shareMode === 'disabled'
														? '关闭'
														: '生成'}
											</button>
										) : (
											<p className='text-xs text-muted'>无权限</p>
										)}
									</div>
								</section>

								<section className='rounded-[14px] border border-black/6 bg-white p-3.5'>
									<div className='flex items-center justify-between gap-3'>
										<div className='flex items-center gap-2'>
											<p className='text-sm font-semibold text-foreground'>
												成员
											</p>
											<p className='text-xs text-muted'>
												共 {allMembers.length} 位
											</p>
										</div>
										<span className='text-xs text-muted'>
											{canManage ? '可管理' : '只读'}
										</span>
									</div>

									{canManage ? (
										<div className='mt-3 rounded-[12px] bg-[#fafaf8] p-2'>
											<div className='grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_84px_68px]'>
												<Select
													value={inviteEmail || undefined}
													showSearch
													allowClear
													size='middle'
													placeholder='选择成员'
													optionFilterProp='label'
													popupMatchSelectWidth={false}
													className='share-modal-select'
													popupClassName='share-modal-dropdown'
													options={inviteCandidateOptions.map((option) => ({
														value: option.value,
														label: option.label,
														title: option.description,
													}))}
													filterOption={(input, option) => {
														const label =
															typeof option?.label === 'string'
																? option.label
																: '';
														const title =
															typeof option?.title === 'string'
																? option.title
																: '';
														return `${label} ${title}`
															.toLowerCase()
															.includes(input.toLowerCase());
													}}
													onChange={(value) => setInviteEmail(value ?? '')}
												/>
												<Select
													value={inviteRole}
													size='middle'
													popupMatchSelectWidth={false}
													className='share-modal-select share-modal-select-role'
													popupClassName='share-modal-dropdown'
													options={inviteRoleOptions}
													onChange={(value) =>
														setInviteRole(value as 'editor' | 'viewer')
													}
												/>
												<button
													type='button'
													disabled={isInvitePending || !inviteEmail.trim()}
													onClick={handleInviteSubmit}
													className='inline-flex h-9 items-center justify-center rounded-lg bg-[#151515] px-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/30'
												>
													{isInvitePending ? '处理中' : '添加'}
												</button>
											</div>

											{selectedInviteCandidate ? (
												<p className='mt-2 truncate text-xs text-muted'>
													{selectedInviteCandidate.email}
												</p>
											) : null}
										</div>
									) : null}

									{canManage && inviteCandidates.length === 0 ? (
										<p className='mt-2 text-xs text-muted'>
											当前没有可添加的新成员
										</p>
									) : null}

									<div className='mt-3'>
										{allMembers.map((member) => (
											<MemberRow
												key={member.id}
												documentId={documentId}
												member={member}
												canManage={canManage}
												onRoleChange={handleRoleChange}
												onRemove={handleRemove}
												pending={isMemberPending}
											/>
										))}
									</div>
								</section>

								<section className='rounded-[14px] border border-black/6 bg-white p-3.5'>
									<button
										type='button'
										onClick={() => setShowActivity((value) => !value)}
										className='flex w-full items-center justify-between gap-3 text-left'
									>
										<div className='flex items-center gap-2'>
											<span className='inline-flex size-7 items-center justify-center rounded-md bg-[#f4f4f1] text-foreground'>
												<HistoryIcon />
											</span>
											<div>
												<p className='text-sm font-semibold text-foreground'>
													最近活动
												</p>
												<p className='mt-0.5 text-xs text-muted'>
													{activities.length} 条记录
												</p>
											</div>
										</div>
										<ChevronIcon open={showActivity} />
									</button>

									{showActivity ? (
										<div className='mt-3 rounded-[12px] bg-[#fafaf8] px-4 py-2'>
											{activities.length > 0 ? (
												<div className='space-y-0.5'>
													{activities.map((activity, index) => (
														<div
															key={activity.id}
															className='grid grid-cols-[16px_minmax(0,1fr)] gap-3 py-3'
														>
															<div className='relative flex justify-center'>
																<span className='mt-1.5 h-2 w-2 rounded-full bg-[#151515]' />
																{index < activities.length - 1 ? (
																	<span className='absolute top-4.5 bottom-[-12px] left-1/2 w-px -translate-x-1/2 bg-black/8' />
																) : null}
															</div>

															<div className='min-w-0'>
																<p className='text-[13px] leading-6 text-foreground'>
																	{describeActivity(activity)}
																</p>
																<p className='mt-1 text-[11px] font-medium text-muted'>
																	{formatRelativeTime(activity.createdAt)}
																</p>
															</div>
														</div>
													))}
												</div>
											) : (
												<div className='py-4 text-sm text-muted'>
													暂时还没有协作记录
												</div>
											)}
										</div>
									) : null}
								</section>
							</div>
						</div>
					</div>
				</ModalShell>
			) : null}
		</>
	);
}
