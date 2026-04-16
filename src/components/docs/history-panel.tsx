'use client';

import { message } from 'antd';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { restoreDocumentVersionAction } from '@/app/actions/documents';
import { ModalShell } from '@/components/ui/modal-shell';
import { formatDateTime, formatRelativeTime } from '@/lib/time';
import { nameFromEmail, userColorFromString } from '@/lib/utils';

type HistoryPanelProps = {
	documentId: string;
	canRestore: boolean;
	versions: Array<{
		id: string;
		title: string;
		source: 'edit' | 'rename' | 'restore' | 'system';
		createdAt: Date;
		createdBy: {
			id: string;
			name: string | null;
			email: string;
		} | null;
	}>;
};

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

function getInitial(name: string | null, email: string) {
	return Array.from((name?.trim() || email).trim())[0]?.toUpperCase() ?? '?';
}

function sourceLabel(source: HistoryPanelProps['versions'][number]['source']) {
	switch (source) {
		case 'rename':
			return '标题变更';
		case 'restore':
			return '恢复版本';
		case 'system':
			return '系统快照';
		default:
			return '内容快照';
	}
}

export function HistoryPanel({
	documentId,
	canRestore,
	versions,
}: HistoryPanelProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	function handleRestore(versionId: string) {
		startTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', documentId);
			formData.set('versionId', versionId);

			const result = await restoreDocumentVersionAction({}, formData);

			if (!result.ok) {
				message.error(result.message || '恢复版本失败');
				return;
			}

			message.success(result.message || '操作已完成');
			setOpen(false);
			router.refresh();
		});
	}

	return (
		<>
			<button
				type='button'
				onClick={() => setOpen(true)}
				className='inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground'
			>
				<HistoryIcon />
				历史
			</button>

			{open ? (
				<ModalShell
					onClose={() => setOpen(false)}
					className='w-full max-w-[520px] rounded-[18px] border border-black/8 bg-white p-0 shadow-[0_20px_64px_rgba(15,23,42,0.14)]'
				>
					<div className='flex max-h-[min(78vh,720px)] flex-col overflow-hidden'>
						<div className='flex items-center justify-between gap-4 border-b border-black/6 px-4 py-3'>
							<div>
								<h2 className='text-base font-semibold text-foreground'>
									版本历史
								</h2>
								<p className='mt-0.5 text-xs text-muted'>
									最近 {versions.length} 个可恢复快照
								</p>
							</div>

							<button
								type='button'
								onClick={() => setOpen(false)}
								className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-foreground'
								aria-label='关闭版本历史'
							>
								<CloseIcon />
							</button>
						</div>

						<div className='min-h-0 overflow-y-auto px-3 py-3'>
							{versions.length > 0 ? (
								<div className='space-y-2'>
									{versions.map((version, index) => {
										const actorLabel =
											version.createdBy?.name?.trim() ||
											(version.createdBy?.email
												? nameFromEmail(version.createdBy.email)
												: '系统');
										const actorEmail =
											version.createdBy?.email || 'system@local';

										return (
											<article
												key={version.id}
												className='rounded-[16px] bg-[#fafaf8] px-4 py-3'
											>
												<div className='flex items-start gap-3'>
													<span
														className='inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white'
														style={{
															backgroundColor: userColorFromString(actorEmail),
														}}
													>
														{getInitial(
															version.createdBy?.name ?? null,
															actorEmail,
														)}
													</span>

													<div className='min-w-0 flex-1'>
														<div className='flex flex-wrap items-center gap-2'>
															<p className='text-sm font-medium text-foreground'>
																{actorLabel}
															</p>
															<span className='inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-black/6'>
																{sourceLabel(version.source)}
															</span>
															{index === 0 ? (
																<span className='inline-flex rounded-full bg-[#151515] px-2 py-0.5 text-[11px] font-semibold text-white'>
																	当前
																</span>
															) : null}
														</div>

														<p className='mt-1 truncate text-sm text-foreground'>
															{version.title}
														</p>
														<p className='mt-1 text-xs text-muted'>
															{formatRelativeTime(version.createdAt)} ·{' '}
															{formatDateTime(version.createdAt)}
														</p>
													</div>

													{canRestore ? (
														<button
															type='button'
															disabled={isPending || index === 0}
															onClick={() => handleRestore(version.id)}
															className='inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-white px-3 text-xs font-semibold text-foreground ring-1 ring-black/8 transition hover:bg-[#f3f3ef] disabled:cursor-not-allowed disabled:opacity-50'
														>
															恢复
														</button>
													) : null}
												</div>
											</article>
										);
									})}
								</div>
							) : (
								<div className='flex min-h-[240px] items-center justify-center text-center'>
									<div>
										<p className='text-sm font-semibold text-foreground'>
											还没有可用快照
										</p>
										<p className='mt-1 text-sm text-muted'>
											后续编辑会自动沉淀到版本历史中
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
