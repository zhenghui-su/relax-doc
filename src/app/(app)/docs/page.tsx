import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listDocumentsForUser } from '@/lib/documents';
import { CreateDocumentModal } from '@/components/docs/create-document-modal';
import { DocumentRowActions } from '@/components/docs/document-row-actions';
import { HeaderSlotRegistration } from '@/components/layout/header-slot';
import { type DocumentListItem } from '@/types/document';
import { cn, roleLabel } from '@/lib/utils';

type DocumentsView = 'all' | 'favorites' | 'shared' | 'archived' | 'trash';

const VIEW_LABELS: Record<
	DocumentsView,
	{ title: string; description: string }
> = {
	all: {
		title: '全部文档',
		description: '按最近更新时间排列的页面树',
	},
	favorites: {
		title: '收藏',
		description: '你标记过的常用页面',
	},
	shared: {
		title: '共享给我',
		description: '由其他成员创建并共享的页面',
	},
	archived: {
		title: '已归档',
		description: '已从主导航隐藏的页面',
	},
	trash: {
		title: '回收站',
		description: '已删除页面会先进入回收站，可在这里恢复或彻底删除',
	},
};

function formatDate(value: Date) {
	return new Intl.DateTimeFormat('zh-CN', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(value);
}

function FileIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M6 3.75h5.3c.2 0 .39.08.53.22l2.2 2.2c.14.14.22.33.22.53V15.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-11A.75.75 0 0 1 6 3.75Z'
				stroke='currentColor'
				strokeWidth='1.4'
				strokeLinejoin='round'
			/>
			<path
				d='M11.25 3.95V6.5h2.55'
				stroke='currentColor'
				strokeWidth='1.4'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='m14.25 14.25 3.25 3.25M15.5 9A6.5 6.5 0 1 1 2.5 9a6.5 6.5 0 0 1 13 0Z'
				stroke='currentColor'
				strokeWidth='1.6'
				strokeLinecap='round'
			/>
		</svg>
	);
}

function StarIcon({ filled = false }: { filled?: boolean }) {
	return (
		<svg
			viewBox='0 0 20 20'
			fill={filled ? 'currentColor' : 'none'}
			className='h-3.5 w-3.5'
		>
			<path
				d='m10 2.9 2.16 4.38 4.84.7-3.5 3.4.83 4.81L10 14.3 5.67 16.2l.83-4.81L3 7.98l4.84-.7L10 2.9Z'
				stroke='currentColor'
				strokeWidth={filled ? '0' : '1.45'}
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function ArchiveIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-3.5 w-3.5'>
			<path
				d='M4.75 5.25h10.5l-.75 9a1 1 0 0 1-1 .92h-7a1 1 0 0 1-1-.92l-.75-9ZM4 5.25V4a.75.75 0 0 1 .75-.75h10.5A.75.75 0 0 1 16 4v1.25M8 9.25h4'
				stroke='currentColor'
				strokeWidth='1.45'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-3.5 w-3.5'>
			<path
				d='M5.75 6.25h8.5m-7.5 0 .55 8.1c.03.52.47.92 1 .92h3.4c.53 0 .97-.4 1-.92l.55-8.1M8 6.25V5a.75.75 0 0 1 .75-.75h2.5A.75.75 0 0 1 12 5v1.25'
				stroke='currentColor'
				strokeWidth='1.45'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function getView(value?: string): DocumentsView {
	if (
		value === 'favorites' ||
		value === 'shared' ||
		value === 'archived' ||
		value === 'trash'
	) {
		return value;
	}

	return 'all';
}

function getDocumentPath(
	document: DocumentListItem,
	documentMap: Map<string, DocumentListItem>,
) {
	const segments: string[] = [];
	let current = document.parentId;
	let guard = 0;

	while (current && guard < 12) {
		const parent = documentMap.get(current);

		if (!parent) {
			break;
		}

		segments.unshift(parent.title);
		current = parent.parentId;
		guard += 1;
	}

	return segments.join(' / ');
}

function getSearchTarget(
	document: DocumentListItem,
	documentMap: Map<string, DocumentListItem>,
) {
	return `${document.title} ${getDocumentPath(document, documentMap)}`.toLowerCase();
}

function getViewDocuments(documents: DocumentListItem[], view: DocumentsView) {
	if (view === 'trash') {
		return documents.filter((document) => Boolean(document.deletedAt));
	}

	if (view === 'favorites') {
		return documents.filter(
			(document) =>
				!document.deletedAt && !document.isArchived && document.isFavorite,
		);
	}

	if (view === 'shared') {
		return documents.filter(
			(document) =>
				!document.deletedAt &&
				!document.isArchived &&
				document.role !== 'owner',
		);
	}

	if (view === 'archived') {
		return documents.filter(
			(document) => !document.deletedAt && document.isArchived,
		);
	}

	return documents.filter(
		(document) => !document.deletedAt && !document.isArchived,
	);
}

function EmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className='flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 text-center'>
			<p className='text-base font-medium text-foreground'>{title}</p>
			<p className='max-w-md text-sm text-muted'>{description}</p>
			<CreateDocumentModal />
		</div>
	);
}

export default async function DocumentsPage({
	searchParams,
}: {
	searchParams: Promise<{ view?: string; q?: string }>;
}) {
	const user = await requireUser('/docs');
	const documents = await listDocumentsForUser(user.id);
	const params = await searchParams;
	const currentView = getView(params.view);
	const query = params.q?.trim() ?? '';
	const normalizedQuery = query.toLowerCase();
	const documentMap = new Map(
		documents.map((document) => [document.id, document]),
	);
	const childCountMap = documents.reduce((map, document) => {
		if (!document.parentId) {
			return map;
		}

		map.set(document.parentId, (map.get(document.parentId) ?? 0) + 1);
		return map;
	}, new Map<string, number>());

	const counts = {
		all: documents.filter(
			(document) => !document.deletedAt && !document.isArchived,
		).length,
		favorites: documents.filter(
			(document) =>
				!document.deletedAt && !document.isArchived && document.isFavorite,
		).length,
		shared: documents.filter(
			(document) =>
				!document.deletedAt &&
				!document.isArchived &&
				document.role !== 'owner',
		).length,
		archived: documents.filter(
			(document) => !document.deletedAt && document.isArchived,
		).length,
		trash: documents.filter((document) => Boolean(document.deletedAt)).length,
	} satisfies Record<DocumentsView, number>;

	const viewDocuments = getViewDocuments(documents, currentView);
	const filteredDocuments = normalizedQuery
		? viewDocuments.filter((document) =>
				getSearchTarget(document, documentMap).includes(normalizedQuery),
			)
		: viewDocuments;
	const viewMeta = VIEW_LABELS[currentView];

	return (
		<div className='flex w-full flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8'>
			<HeaderSlotRegistration>
				<div className='flex min-w-0 items-center justify-between gap-3'>
					<div className='flex min-w-0 items-center gap-2'>
						<span className='text-sm font-medium text-muted'>文档空间</span>
						<span className='text-sm text-muted'>/</span>
						<span className='truncate text-sm font-semibold text-foreground'>
							{viewMeta.title}
						</span>
					</div>
					<CreateDocumentModal />
				</div>
			</HeaderSlotRegistration>

			<section className='flex min-h-0 flex-1 flex-col gap-5'>
				<div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
					<div className='space-y-1'>
						<h1 className='text-[1.75rem] font-semibold tracking-[-0.04em] text-foreground'>
							文档空间
						</h1>
						<p className='text-sm text-muted'>
							{query
								? `在“${viewMeta.title}”中找到 ${filteredDocuments.length} 条结果`
								: viewMeta.description}
						</p>
					</div>

					<form
						action='/docs'
						className='flex w-full max-w-xl items-center gap-2 lg:justify-end'
					>
						{currentView !== 'all' ? (
							<input type='hidden' name='view' value={currentView} />
						) : null}
						<label className='flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/86 px-3 text-muted shadow-[0_8px_20px_rgba(15,23,42,0.04)]'>
							<SearchIcon />
							<input
								type='text'
								name='q'
								defaultValue={query}
								placeholder='搜索标题或父页面'
								className='min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft'
							/>
						</label>
						<button
							type='submit'
							className='inline-flex h-10 shrink-0 items-center rounded-xl bg-[#151515] px-4 text-sm font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:bg-black'
						>
							搜索
						</button>
						{query ? (
							<Link
								href={
									currentView === 'all' ? '/docs' : `/docs?view=${currentView}`
								}
								className='inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-muted hover:bg-black/[0.045] hover:text-foreground'
							>
								清除
							</Link>
						) : null}
					</form>
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					{(
						[
							['all', '全部'],
							['favorites', '收藏'],
							['shared', '共享给我'],
							['archived', '已归档'],
							['trash', '回收站'],
						] as Array<[DocumentsView, string]>
					).map(([view, label]) => {
						const href = view === 'all' ? '/docs' : `/docs?view=${view}`;
						const active = currentView === view;

						return (
							<Link
								key={view}
								href={href}
								className={cn(
									'inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition',
									active
										? 'bg-[#151515] text-white shadow-[0_10px_24px_rgba(15,23,42,0.1)]'
										: 'bg-white/72 text-muted hover:bg-white hover:text-foreground',
								)}
							>
								{label}
								<span
									className={cn(
										'text-xs',
										active ? 'text-white/72' : 'text-muted-soft',
									)}
								>
									{counts[view]}
								</span>
							</Link>
						);
					})}
				</div>

				<div className='flex items-center justify-between gap-3 text-xs text-muted'>
					<p>{filteredDocuments.length} 个页面</p>
					<p>
						{currentView === 'trash'
							? '拖拽层级不会作用于回收站中的页面'
							: counts.archived > 0
								? `已归档 ${counts.archived} 个页面`
								: '所有改动会自动保存'}
					</p>
				</div>

				{documents.length === 0 ? (
					<EmptyState
						title='还没有文档'
						description='从右上角新建第一个页面，开始搭建你的协同空间'
					/>
				) : filteredDocuments.length === 0 ? (
					<div className='flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 text-center'>
						<p className='text-base font-medium text-foreground'>
							没有匹配的页面
						</p>
						<p className='max-w-md text-sm text-muted'>
							{query
								? '换个关键词，或者切换到其他视图继续查找'
								: '这个视图里暂时还没有内容'}
						</p>
					</div>
				) : (
					<div className='space-y-1'>
						{filteredDocuments.map((document) => {
							const parentPath = getDocumentPath(document, documentMap);
							const childCount = childCountMap.get(document.id) ?? 0;

							return (
								<div
									key={document.id}
									className='group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/82'
								>
									{document.deletedAt ? (
										<div className='flex min-w-0 flex-1 items-center gap-3'>
											<span className='inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/84 text-muted shadow-[0_8px_18px_rgba(15,23,42,0.05)]'>
												<FileIcon />
											</span>

											<span className='min-w-0 flex-1'>
												<span className='flex items-center gap-2'>
													<span className='truncate text-sm font-medium text-foreground sm:text-[15px]'>
														{document.title}
													</span>
													<span className='inline-flex h-6 items-center gap-1 rounded-full bg-black/[0.055] px-2 text-[11px] font-medium text-foreground'>
														<TrashIcon />
														回收站
													</span>
												</span>

												<span className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted'>
													{parentPath ? (
														<span className='truncate'>{parentPath}</span>
													) : null}
													{document.role !== 'owner' ? (
														<span className='inline-flex h-6 items-center rounded-full bg-black/[0.045] px-2.5 text-[11px] font-medium text-foreground'>
															{roleLabel(document.role)}
														</span>
													) : null}
													<span>已删除，可恢复</span>
												</span>
											</span>
										</div>
									) : (
										<Link
											href={`/docs/${document.id}`}
											className='flex min-w-0 flex-1 items-center gap-3'
										>
											<span className='inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/84 text-muted shadow-[0_8px_18px_rgba(15,23,42,0.05)]'>
												<FileIcon />
											</span>

											<span className='min-w-0 flex-1'>
												<span className='flex items-center gap-2'>
													<span className='truncate text-sm font-medium text-foreground sm:text-[15px]'>
														{document.title}
													</span>
													{document.isFavorite ? (
														<span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700'>
															<StarIcon filled />
														</span>
													) : null}
													{document.isArchived ? (
														<span className='inline-flex h-6 items-center gap-1 rounded-full bg-black/[0.055] px-2 text-[11px] font-medium text-foreground'>
															<ArchiveIcon />
															已归档
														</span>
													) : null}
												</span>

												<span className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted'>
													{parentPath ? (
														<span className='truncate'>{parentPath}</span>
													) : null}
													{document.role !== 'owner' ? (
														<span className='inline-flex h-6 items-center rounded-full bg-black/[0.045] px-2.5 text-[11px] font-medium text-foreground'>
															{roleLabel(document.role)}
														</span>
													) : null}
													{childCount > 0 ? (
														<span>{childCount} 个子页面</span>
													) : null}
												</span>
											</span>
										</Link>
									)}

									<div className='hidden shrink-0 text-right lg:block'>
										<p className='text-xs font-medium text-foreground/84'>
											{formatDate(document.deletedAt ?? document.updatedAt)}
										</p>
										<p className='mt-1 text-[11px] text-muted'>
											{document.deletedAt
												? '已删除'
												: document.parentId
													? '子页面'
													: '独立页面'}
										</p>
									</div>

									<DocumentRowActions
										documentId={document.id}
										canEdit={
											document.role === 'owner' || document.role === 'editor'
										}
										canDelete={document.role === 'owner'}
										isArchived={document.isArchived}
										isDeleted={Boolean(document.deletedAt)}
										isFavorite={document.isFavorite}
									/>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
