'use client';

import { message } from 'antd';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
	createDocumentCommentAction,
	deleteDocumentCommentAction,
	toggleResolveDocumentCommentAction,
} from '@/app/actions/comments';
import { ModalShell } from '@/components/ui/modal-shell';
import { formatRelativeTime } from '@/lib/time';
import { cn, nameFromEmail, userColorFromString } from '@/lib/utils';

type CommentPanelProps = {
	documentId: string;
	currentUserId: string;
	canComment: boolean;
	initialCommentId: string | null;
	comments: Array<{
		id: string;
		content: string;
		quote: string | null;
		resolvedAt: Date | null;
		resolvedBy: {
			id: string;
			name: string | null;
			email: string;
		} | null;
		createdAt: Date;
		updatedAt: Date;
		author: {
			id: string;
			name: string | null;
			email: string;
		};
		replies: Array<{
			id: string;
			content: string;
			quote: string | null;
			createdAt: Date;
			updatedAt: Date;
			author: {
				id: string;
				name: string | null;
				email: string;
			};
		}>;
	}>;
};

function CommentIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M5.75 14.75H4.5a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H9.25L6 17.25v-2.5Z'
				stroke='currentColor'
				strokeWidth='1.45'
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

function QuoteIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M6 7.25H4.75A1.75 1.75 0 0 0 3 9v2.25A1.75 1.75 0 0 0 4.75 13H6V7.25ZM13.75 7.25H12.5A1.75 1.75 0 0 0 10.75 9v2.25A1.75 1.75 0 0 0 12.5 13h1.25V7.25Z'
				stroke='currentColor'
				strokeWidth='1.6'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function getInitial(name: string | null, email: string) {
	return Array.from((name?.trim() || email).trim())[0]?.toUpperCase() ?? '?';
}

function formatCommentTime(value: Date, updatedAt: Date) {
	const label = formatRelativeTime(value);

	if (updatedAt.getTime() - value.getTime() > 1000) {
		return `${label} · 已编辑`;
	}

	return label;
}

function CommentAvatar({
	name,
	email,
}: {
	name: string | null;
	email: string;
}) {
	return (
		<span
			className='inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white'
			style={{ backgroundColor: userColorFromString(email) }}
		>
			{getInitial(name, email)}
		</span>
	);
}

function QuoteBlock({ quote }: { quote: string }) {
	return (
		<div className='mt-2 rounded-2xl bg-[#f5f5f2] px-3 py-2.5 text-xs leading-5 text-muted'>
			<div className='mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted'>
				<QuoteIcon />
				引用
			</div>
			<p className='line-clamp-4 whitespace-pre-wrap'>{quote}</p>
		</div>
	);
}

function CommentMessage({
	content,
	quote,
}: {
	content: string;
	quote: string | null;
}) {
	return (
		<div className='min-w-0 flex-1'>
			{quote ? <QuoteBlock quote={quote} /> : null}
			<p
				className={cn(
					'whitespace-pre-wrap text-sm leading-6 text-foreground',
					quote ? 'mt-2' : 'mt-1.5',
				)}
			>
				{content}
			</p>
		</div>
	);
}

export function CommentPanel({
	documentId,
	currentUserId,
	canComment,
	initialCommentId,
	comments,
}: CommentPanelProps) {
	const router = useRouter();
	const [open, setOpen] = useState(Boolean(initialCommentId));
	const [draft, setDraft] = useState('');
	const [draftQuote, setDraftQuote] = useState<string | null>(null);
	const [replyToId, setReplyToId] = useState<string | null>(null);
	const [filter, setFilter] = useState<'all' | 'open'>('all');
	const [isSubmitting, startSubmitTransition] = useTransition();
	const [isDeleting, startDeleteTransition] = useTransition();
	const [isResolving, startResolveTransition] = useTransition();

	const visibleThreads = useMemo(() => {
		if (filter === 'open') {
			return comments.filter((comment) => !comment.resolvedAt);
		}

		return comments;
	}, [comments, filter]);

	const unresolvedCount = useMemo(() => {
		return comments.filter((comment) => !comment.resolvedAt).length;
	}, [comments]);

	async function refreshWithMessage(result: {
		ok?: boolean;
		message?: string;
	}) {
		if (!result.ok) {
			message.error(result.message || '操作失败');
			return false;
		}

		message.success(result.message || '操作已完成');
		router.refresh();
		return true;
	}

	function getSelectionQuote(notifyWhenEmpty = false) {
		const selected = window.getSelection?.()?.toString().trim() || '';

		if (!selected) {
			if (notifyWhenEmpty) {
				message.info('先在文档中选中一段文字');
			}
			return null;
		}

		const nextQuote = selected.slice(0, 240);
		setDraftQuote(nextQuote);
		return nextQuote;
	}

	function openPanel() {
		getSelectionQuote(false);
		setOpen(true);
	}

	function resetComposer() {
		setDraft('');
		setDraftQuote(null);
		setReplyToId(null);
	}

	function handleSubmit() {
		startSubmitTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', documentId);
			formData.set('content', draft);

			if (replyToId) {
				formData.set('parentId', replyToId);
			}

			if (draftQuote) {
				formData.set('quote', draftQuote);
			}

			const ok = await refreshWithMessage(
				await createDocumentCommentAction({}, formData),
			);

			if (!ok) {
				return;
			}

			resetComposer();
		});
	}

	function handleDelete(commentId: string) {
		startDeleteTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', documentId);
			formData.set('commentId', commentId);
			await refreshWithMessage(await deleteDocumentCommentAction({}, formData));
		});
	}

	function handleToggleResolve(commentId: string) {
		startResolveTransition(async () => {
			const formData = new FormData();
			formData.set('documentId', documentId);
			formData.set('commentId', commentId);
			await refreshWithMessage(
				await toggleResolveDocumentCommentAction({}, formData),
			);
		});
	}

	const composerLabel = replyToId ? '回复讨论' : '新讨论';

	return (
		<>
			<button
				type='button'
				onClick={openPanel}
				className='inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-black/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6'
			>
				<CommentIcon />
				评论
				{comments.length > 0 ? (
					<span className='inline-flex min-w-5 items-center justify-center rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-muted'>
						{unresolvedCount}
					</span>
				) : null}
			</button>

			{open ? (
				<ModalShell
					onClose={() => setOpen(false)}
					className='w-full max-w-[520px] rounded-[24px] bg-[#fbfbf8] p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)]'
				>
					<div className='flex max-h-[min(84vh,760px)] min-h-[560px] flex-col overflow-hidden'>
						<div className='border-b border-black/6 bg-[#fbfbf8]/95 px-5 py-4 backdrop-blur'>
							<div className='flex items-start justify-between gap-4'>
								<div className='min-w-0'>
									<div className='flex items-center gap-2'>
										<h2 className='text-[15px] font-semibold text-foreground'>
											讨论
										</h2>
										<span className='inline-flex min-w-5 items-center justify-center rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-muted'>
											{comments.length}
										</span>
									</div>
									<p className='mt-1 text-xs text-muted'>
										{unresolvedCount > 0
											? `${unresolvedCount} 条未解决`
											: '所有讨论都已处理'}
									</p>
								</div>

								<div className='flex items-center gap-2'>
									<div className='inline-flex rounded-full bg-[#f1f1ed] p-1'>
										<button
											type='button'
											onClick={() => setFilter('all')}
											className={cn(
												'inline-flex h-7 items-center rounded-full px-3 text-[11px] font-medium transition',
												filter === 'all'
													? 'bg-white text-foreground shadow-sm'
													: 'text-muted hover:text-foreground',
											)}
										>
											全部
										</button>
										<button
											type='button'
											onClick={() => setFilter('open')}
											className={cn(
												'inline-flex h-7 items-center rounded-full px-3 text-[11px] font-medium transition',
												filter === 'open'
													? 'bg-white text-foreground shadow-sm'
													: 'text-muted hover:text-foreground',
											)}
										>
											未解决
										</button>
									</div>

									<button
										type='button'
										onClick={() => setOpen(false)}
										className='inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-foreground'
										aria-label='关闭评论面板'
									>
										<CloseIcon />
									</button>
								</div>
							</div>
						</div>

						<div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
							<div className='space-y-2.5'>
								{visibleThreads.length > 0 ? (
									<div className='space-y-2.5'>
										{visibleThreads.map((comment) => {
											const canDeleteRoot = comment.author.id === currentUserId;
											const isHighlighted = initialCommentId === comment.id;
											const resolverLabel =
												comment.resolvedBy?.name?.trim() ||
												(comment.resolvedBy?.email
													? nameFromEmail(comment.resolvedBy.email)
													: '成员');

											return (
												<article
													key={comment.id}
													id={`comment-${comment.id}`}
													className={cn(
														'rounded-[20px] bg-white px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.06)] transition',
														comment.resolvedAt
															? 'opacity-80'
															: '',
														isHighlighted && 'ring-2 ring-black/10',
													)}
												>
													<div className='flex items-start gap-3'>
														<CommentAvatar
															name={comment.author.name}
															email={comment.author.email}
														/>

														<div className='min-w-0 flex-1'>
															<div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
																<p className='text-sm font-medium text-foreground'>
																	{comment.author.name?.trim() ||
																		nameFromEmail(comment.author.email)}
																</p>
																<p className='text-xs text-muted'>
																	{formatCommentTime(
																		comment.createdAt,
																		comment.updatedAt,
																	)}
																</p>
																{comment.resolvedAt ? (
																	<span className='inline-flex rounded-full bg-[#f3f3ef] px-2 py-0.5 text-[11px] font-medium text-muted'>
																		已解决
																	</span>
																) : null}
															</div>

															<CommentMessage
																content={comment.content}
																quote={comment.quote}
															/>

															{comment.resolvedAt ? (
																<p className='mt-2 text-xs text-muted'>
																	{resolverLabel} 于{' '}
																	{formatRelativeTime(comment.resolvedAt)}{' '}
																	标记为已解决
																</p>
															) : null}

															<div className='mt-3 flex flex-wrap items-center gap-1'>
																<button
																	type='button'
																	onClick={() => {
																		setReplyToId(comment.id);
																		setOpen(true);
																	}}
																	className='inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-[#f5f5f2] hover:text-foreground'
																>
																	回复
																</button>

																<button
																	type='button'
																	disabled={isResolving}
																	onClick={() =>
																		handleToggleResolve(comment.id)
																	}
																	className='inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-[#f5f5f2] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60'
																>
																	{comment.resolvedAt ? '重新打开' : '解决'}
																</button>

																{canDeleteRoot ? (
																	<button
																		type='button'
																		disabled={isDeleting}
																		onClick={() => handleDelete(comment.id)}
																		className='inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-[#b94728] transition hover:bg-[#fff1ee] disabled:cursor-not-allowed disabled:opacity-60'
																	>
																		删除
																	</button>
																) : null}
															</div>

															{comment.replies.length > 0 ? (
																<div className='mt-4 space-y-3 border-l border-black/8 pl-4'>
																	{comment.replies.map((reply) => {
																		const canDeleteReply =
																			reply.author.id === currentUserId;

																		return (
																			<div
																				key={reply.id}
																				className='flex items-start gap-3'
																			>
																				<CommentAvatar
																					name={reply.author.name}
																					email={reply.author.email}
																				/>

																				<div className='min-w-0 flex-1 px-0.5 py-0.5'>
																					<div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
																						<p className='text-sm font-medium text-foreground'>
																							{reply.author.name?.trim() ||
																								nameFromEmail(
																									reply.author.email,
																								)}
																						</p>
																						<p className='text-xs text-muted'>
																							{formatCommentTime(
																								reply.createdAt,
																								reply.updatedAt,
																							)}
																						</p>
																					</div>

																					<CommentMessage
																						content={reply.content}
																						quote={reply.quote}
																					/>

																					{canDeleteReply ? (
																						<div className='mt-2'>
																							<button
																								type='button'
																								disabled={isDeleting}
																								onClick={() =>
																									handleDelete(reply.id)
																								}
																								className='inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-[#b94728] transition hover:bg-[#fff1ee] disabled:cursor-not-allowed disabled:opacity-60'
																							>
																								删除
																							</button>
																						</div>
																					) : null}
																				</div>
																			</div>
																		);
																	})}
																</div>
															) : null}
														</div>
													</div>
												</article>
											);
										})}
									</div>
								) : (
									<div className='flex min-h-full items-center justify-center px-6 py-12 text-center'>
										<div>
											<p className='text-sm font-semibold text-foreground'>
												{filter === 'open' ? '没有待处理讨论' : '还没有讨论'}
											</p>
											<p className='mt-1 text-sm text-muted'>
												{filter === 'open'
													? '当前所有讨论都已处理'
													: '可以先留下第一条讨论'}
											</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{canComment ? (
							<div className='border-t border-black/6 bg-white px-4 py-3'>
								<div className='rounded-[20px] bg-[#f7f7f3] p-3'>
									<div className='mb-2 flex items-center justify-between gap-3'>
										<p className='text-xs font-medium text-foreground'>
											{composerLabel}
										</p>
										<p className='text-[11px] text-muted'>
											{draft.trim().length}/2000
										</p>
									</div>

									{replyToId ? (
										<div className='mb-2 flex items-center justify-between gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-muted'>
											<span>正在回复一条讨论</span>
											<button
												type='button'
												onClick={() => setReplyToId(null)}
												className='font-medium text-foreground'
											>
												取消
											</button>
										</div>
									) : null}

									{draftQuote ? (
										<div className='mb-2 rounded-2xl bg-white px-3 py-2 text-xs text-muted'>
											<div className='flex items-center justify-between gap-3'>
												<span className='font-medium text-foreground'>引用</span>
												<button
													type='button'
													onClick={() => setDraftQuote(null)}
													className='font-medium text-muted transition hover:text-foreground'
												>
													移除
												</button>
											</div>
											<p className='mt-1 line-clamp-3 whitespace-pre-wrap'>
												{draftQuote}
											</p>
										</div>
									) : null}

									<textarea
										value={draft}
										onChange={(event) => setDraft(event.target.value)}
										placeholder={replyToId ? '写下回复' : '发起一个讨论'}
										className='min-h-[96px] w-full resize-none rounded-[16px] bg-white px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted'
									/>

									<div className='mt-3 flex items-center justify-between gap-3'>
										<button
											type='button'
											onClick={() => getSelectionQuote(true)}
											className='inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-white hover:text-foreground'
										>
											<QuoteIcon />
											引用选中
										</button>

										<button
											type='button'
											disabled={isSubmitting || draft.trim().length === 0}
											onClick={handleSubmit}
											className='inline-flex h-9 items-center justify-center rounded-xl bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-black/30'
										>
											{isSubmitting
												? '发布中...'
												: replyToId
													? '回复'
													: '发布'}
										</button>
									</div>
								</div>
							</div>
						) : (
							<div className='border-t border-black/6 bg-white px-4 py-3 text-sm text-muted'>
								仅文档成员可以参与讨论
							</div>
						)}
					</div>
				</ModalShell>
			) : null}
		</>
	);
}
