'use client';

import {
	useDeferredValue,
	useMemo,
	useState,
	useTransition,
	type DragEvent,
	type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { moveDocumentAction } from '@/app/actions/documents';
import { showToast } from '@/lib/toast';
import { cn, roleLabel } from '@/lib/utils';
import { type DocumentListItem } from '@/types/document';

type SidebarDocumentsNavProps = {
	documents: DocumentListItem[];
	collapsed?: boolean;
	onNavigate?: () => void;
};

function SectionTitle({
	children,
	collapsed,
}: {
	children: string;
	collapsed: boolean;
}) {
	if (collapsed) {
		return null;
	}

	return (
		<p className='px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted'>
			{children}
		</p>
	);
}

function WorkspaceIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M4.5 5.5a1 1 0 0 1 1-1h3.75a1 1 0 0 1 1 1v3.75a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V5.5ZM10.75 5.5a1 1 0 0 1 1-1h2.75a1 1 0 0 1 1 1v8.75a1 1 0 0 1-1 1h-2.75a1 1 0 0 1-1-1V5.5ZM4.5 12.25a1 1 0 0 1 1-1h3.75a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-2.75Z'
				stroke='currentColor'
				strokeWidth='1.5'
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
			className='h-4 w-4'
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

function SharedIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
			<path
				d='M6.75 8.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13.25 9.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 15.25a2.75 2.75 0 0 1 5.5 0v.5H4v-.5ZM10.5 15.75v-.5a2.75 2.75 0 0 1 5.5 0v.5h-5.5Z'
				stroke='currentColor'
				strokeWidth='1.45'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function ArchiveIcon() {
	return (
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
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
		<svg viewBox='0 0 20 20' fill='none' className='h-4 w-4'>
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

function PageIcon({ active }: { active: boolean }) {
	return (
		<span
			className={cn(
				'inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold transition',
				active ? 'bg-black/[0.06] text-foreground' : 'bg-white/84 text-muted',
			)}
		>
			<svg viewBox='0 0 20 20' fill='none' className='h-3.5 w-3.5'>
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
		</span>
	);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
	return (
		<svg
			viewBox='0 0 20 20'
			fill='none'
			className={cn(
				'h-3.5 w-3.5 transition-transform duration-200',
				expanded && 'rotate-90',
			)}
		>
			<path
				d='M7.5 5.5 12 10l-4.5 4.5'
				stroke='currentColor'
				strokeWidth='1.7'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	);
}

function NavLink({
	href,
	active,
	collapsed,
	title,
	subtitle,
	meta,
	icon,
	onNavigate,
}: {
	href: string;
	active: boolean;
	collapsed: boolean;
	title: string;
	subtitle?: string;
	meta?: string;
	icon: ReactNode;
	onNavigate?: () => void;
}) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			title={collapsed ? title : undefined}
			className={cn(
				'group relative flex items-center rounded-2xl transition',
				collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5',
				active
					? 'bg-white text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
					: 'text-muted hover:bg-black/[0.035] hover:text-foreground',
			)}
		>
			{icon}
			{collapsed ? (
				<span className='pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-xl bg-[#151515] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100'>
					{title}
				</span>
			) : (
				<span className='min-w-0 flex-1'>
					<span className='flex items-center justify-between gap-2'>
						<span className='truncate text-sm font-medium text-foreground'>
							{title}
						</span>
						{meta ? (
							<span className='shrink-0 text-[11px] font-medium text-muted'>
								{meta}
							</span>
						) : null}
					</span>
					{subtitle ? (
						<span className='mt-0.5 block truncate text-xs text-muted'>
							{subtitle}
						</span>
					) : null}
				</span>
			)}
		</Link>
	);
}

function UtilityLink({
	href,
	active,
	collapsed,
	title,
	count,
	icon,
	onNavigate,
}: {
	href: string;
	active: boolean;
	collapsed: boolean;
	title: string;
	count: number;
	icon: ReactNode;
	onNavigate?: () => void;
}) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			className={cn(
				'group relative inline-flex h-9 items-center justify-center rounded-xl transition',
				collapsed ? 'w-9' : 'min-w-0 px-2.5',
				active
					? 'bg-white text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
					: 'text-muted hover:bg-black/[0.035] hover:text-foreground',
			)}
			aria-label={title}
		>
			<span className='inline-flex size-7 shrink-0 items-center justify-center rounded-lg'>
				{icon}
			</span>
			{!collapsed ? (
				<span className='ml-1.5 text-[11px] font-semibold text-muted'>
					{count}
				</span>
			) : null}
			<span className='pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-xl bg-[#151515] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100'>
				{title}
			</span>
		</Link>
	);
}

function DocumentTreeItem({
	document,
	depth,
	collapsed,
	pathname,
	children,
	hasChildren,
	expanded,
	isDropTarget,
	isDragging,
	canDrag,
	onToggle,
	onNavigate,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDrop,
}: {
	document: DocumentListItem;
	depth: number;
	collapsed: boolean;
	pathname: string;
	children: ReactNode;
	hasChildren: boolean;
	expanded: boolean;
	isDropTarget: boolean;
	isDragging: boolean;
	canDrag: boolean;
	onToggle: () => void;
	onNavigate?: () => void;
	onDragStart: () => void;
	onDragEnd: () => void;
	onDragOver: (event: DragEvent<HTMLDivElement>) => void;
	onDrop: () => void;
}) {
	const active = pathname === `/docs/${document.id}`;

	return (
		<div className='space-y-1'>
			<div
				draggable={canDrag}
				onDragStart={canDrag ? onDragStart : undefined}
				onDragEnd={canDrag ? onDragEnd : undefined}
				onDragOver={canDrag ? onDragOver : undefined}
				onDrop={canDrag ? onDrop : undefined}
				className={cn(
					'group flex items-center rounded-2xl text-muted transition',
					active
						? 'bg-white text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
						: 'hover:bg-black/[0.035] hover:text-foreground',
					isDropTarget && 'bg-black/[0.05] text-foreground ring-1 ring-black/8',
					isDragging && 'opacity-45',
				)}
				style={!collapsed ? { paddingLeft: 12 + depth * 14 } : undefined}
			>
				{hasChildren ? (
					<button
						type='button'
						onClick={onToggle}
						className='inline-flex h-8 w-6 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-foreground'
						aria-label={expanded ? '收起子页面' : '展开子页面'}
					>
						<ChevronIcon expanded={expanded} />
					</button>
				) : (
					<span className='block w-6 shrink-0' aria-hidden />
				)}

				<Link
					href={`/docs/${document.id}`}
					onClick={onNavigate}
					className='flex min-w-0 flex-1 items-center gap-3 py-2 pr-3'
				>
					<PageIcon active={active} />
					<span className='min-w-0 flex-1'>
						<span className='block truncate text-sm font-medium text-foreground'>
							{document.title}
						</span>
						<span className='mt-0.5 block truncate text-xs text-muted'>
							{roleLabel(document.role)}
						</span>
					</span>
				</Link>
			</div>

			{expanded ? children : null}
		</div>
	);
}

export function SidebarDocumentsNav({
	documents,
	collapsed = false,
	onNavigate,
}: SidebarDocumentsNavProps) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState('');
	const [expandedState, setExpandedState] = useState<Record<string, boolean>>(
		{},
	);
	const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(
		null,
	);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [isRootDropTarget, setIsRootDropTarget] = useState(false);
	const [isPending, startMoveTransition] = useTransition();
	const deferredQuery = useDeferredValue(query.trim().toLowerCase());
	const currentView = searchParams.get('view') ?? 'all';
	const isDocsIndex = pathname === '/docs';

	const documentMap = useMemo(
		() => new Map(documents.map((document) => [document.id, document])),
		[documents],
	);

	const activeDocuments = useMemo(
		() =>
			documents.filter(
				(document) => !document.deletedAt && !document.isArchived,
			),
		[documents],
	);
	const archivedDocuments = useMemo(
		() =>
			documents.filter(
				(document) => !document.deletedAt && document.isArchived,
			),
		[documents],
	);
	const trashDocuments = useMemo(
		() => documents.filter((document) => Boolean(document.deletedAt)),
		[documents],
	);
	const activeDocumentIds = useMemo(
		() => new Set(activeDocuments.map((document) => document.id)),
		[activeDocuments],
	);

	const childrenMap = useMemo(() => {
		const map = new Map<string | null, DocumentListItem[]>();

		for (const document of activeDocuments) {
			const key =
				document.parentId && activeDocumentIds.has(document.parentId)
					? document.parentId
					: null;
			const current = map.get(key) ?? [];
			current.push(document);
			map.set(key, current);
		}

		return map;
	}, [activeDocumentIds, activeDocuments]);

	const activeDocumentId = pathname.startsWith('/docs/')
		? (pathname.slice('/docs/'.length).split('/')[0] ?? null)
		: null;

	const activeAncestorIds = useMemo(() => {
		if (!activeDocumentId) {
			return new Set<string>();
		}

		const ids = new Set<string>();
		let current = documentMap.get(activeDocumentId)?.parentId ?? null;

		while (current) {
			ids.add(current);
			current = documentMap.get(current)?.parentId ?? null;
		}

		return ids;
	}, [activeDocumentId, documentMap]);

	const filteredDocuments = useMemo(() => {
		if (!deferredQuery) {
			return activeDocuments;
		}

		return activeDocuments.filter((document) => {
			const segments = [document.title];
			let current = document.parentId;
			let guard = 0;

			while (current && guard < 12) {
				const parent = documentMap.get(current);

				if (!parent) {
					break;
				}

				segments.push(parent.title);
				current = parent.parentId;
				guard += 1;
			}

			return segments.join(' ').toLowerCase().includes(deferredQuery);
		});
	}, [activeDocuments, deferredQuery, documentMap]);

	const favoriteDocuments = useMemo(
		() => activeDocuments.filter((document) => document.isFavorite),
		[activeDocuments],
	);
	const sharedDocuments = useMemo(
		() => activeDocuments.filter((document) => document.role !== 'owner'),
		[activeDocuments],
	);

	const condensedDocuments = useMemo(() => {
		const preferred = deferredQuery
			? filteredDocuments
			: [
					...favoriteDocuments,
					...activeDocuments.filter((document) => !document.isFavorite),
				];

		const seen = new Set<string>();

		return preferred
			.filter((document) => {
				if (seen.has(document.id)) {
					return false;
				}

				seen.add(document.id);
				return true;
			})
			.slice(0, 8);
	}, [activeDocuments, deferredQuery, favoriteDocuments, filteredDocuments]);

	function resetDragState() {
		setDraggedDocumentId(null);
		setDropTargetId(null);
		setIsRootDropTarget(false);
	}

	function moveDraggedDocument(parentId: string | null) {
		const documentId = draggedDocumentId;

		if (!documentId) {
			return;
		}

		startMoveTransition(async () => {
			const state = await moveDocumentAction({ documentId, parentId });

			if (state.ok) {
				showToast({
					message: state.message || '页面层级已更新',
					variant: 'success',
				});
				router.refresh();
			} else if (state.message) {
				showToast({
					message: state.message,
					variant: 'error',
				});
			}

			resetDragState();
		});
	}

	const renderTree = (parentId: string | null, depth = 0): ReactNode => {
		const branch = childrenMap.get(parentId) ?? [];

		return branch.map((document) => {
			const children = childrenMap.get(document.id) ?? [];
			const expanded = activeAncestorIds.has(document.id)
				? true
				: (expandedState[document.id] ?? true);
			const canDrag = !collapsed && !deferredQuery && !isPending;

			return (
				<DocumentTreeItem
					key={document.id}
					document={document}
					depth={depth}
					collapsed={collapsed}
					pathname={pathname}
					hasChildren={children.length > 0}
					expanded={expanded}
					isDropTarget={dropTargetId === document.id}
					isDragging={draggedDocumentId === document.id}
					canDrag={canDrag}
					onToggle={() =>
						setExpandedState((current) => ({
							...current,
							[document.id]: !(current[document.id] ?? true),
						}))
					}
					onNavigate={onNavigate}
					onDragStart={() => {
						setDraggedDocumentId(document.id);
						setDropTargetId(null);
						setIsRootDropTarget(false);
					}}
					onDragEnd={resetDragState}
					onDragOver={(event) => {
						if (!draggedDocumentId || draggedDocumentId === document.id) {
							return;
						}

						event.preventDefault();
						setDropTargetId(document.id);
						setIsRootDropTarget(false);
					}}
					onDrop={() => {
						if (!draggedDocumentId || draggedDocumentId === document.id) {
							resetDragState();
							return;
						}

						setDropTargetId(document.id);
						moveDraggedDocument(document.id);
					}}
				>
					{children.length > 0 ? renderTree(document.id, depth + 1) : null}
				</DocumentTreeItem>
			);
		});
	};

	return (
		<div className='flex h-full min-h-0 flex-col gap-4'>
			{!collapsed ? (
				<div className='px-1'>
					<label className='group flex h-10 items-center gap-2 rounded-xl bg-white/84 px-3 text-muted transition focus-within:bg-white'>
						<SearchIcon />
						<input
							type='text'
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder='搜索页面'
							className='min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-soft'
						/>
					</label>
				</div>
			) : null}

			<div className={cn('space-y-2', collapsed ? 'px-0.5' : 'px-1')}>
				<SectionTitle collapsed={collapsed}>导航</SectionTitle>
				<div
					className={cn('flex flex-wrap gap-1', collapsed && 'justify-center')}
				>
					<UtilityLink
						href='/docs'
						active={isDocsIndex && currentView === 'all'}
						collapsed={collapsed}
						title='全部文档'
						count={activeDocuments.length}
						icon={<WorkspaceIcon />}
						onNavigate={onNavigate}
					/>
					<UtilityLink
						href='/docs?view=favorites'
						active={isDocsIndex && currentView === 'favorites'}
						collapsed={collapsed}
						title='收藏'
						count={favoriteDocuments.length}
						icon={
							<StarIcon filled={isDocsIndex && currentView === 'favorites'} />
						}
						onNavigate={onNavigate}
					/>
					<UtilityLink
						href='/docs?view=shared'
						active={isDocsIndex && currentView === 'shared'}
						collapsed={collapsed}
						title='共享给我'
						count={sharedDocuments.length}
						icon={<SharedIcon />}
						onNavigate={onNavigate}
					/>
					<UtilityLink
						href='/docs?view=archived'
						active={isDocsIndex && currentView === 'archived'}
						collapsed={collapsed}
						title='已归档'
						count={archivedDocuments.length}
						icon={<ArchiveIcon />}
						onNavigate={onNavigate}
					/>
					<UtilityLink
						href='/docs?view=trash'
						active={isDocsIndex && currentView === 'trash'}
						collapsed={collapsed}
						title='回收站'
						count={trashDocuments.length}
						icon={<TrashIcon />}
						onNavigate={onNavigate}
					/>
				</div>
			</div>

			<div className='sidebar-scrollbar min-h-0 flex-1 space-y-4 overflow-x-visible overflow-y-auto overscroll-contain pb-2 pr-1'>
				{documents.length === 0 ? (
					<p
						className={cn(
							'text-sm text-muted',
							collapsed ? 'px-2 text-center' : 'px-3',
						)}
					>
						还没有文档
					</p>
				) : collapsed ? (
					<div className='space-y-1'>
						{condensedDocuments.map((document) => (
							<NavLink
								key={document.id}
								href={`/docs/${document.id}`}
								active={pathname === `/docs/${document.id}`}
								collapsed
								title={document.title}
								subtitle={roleLabel(document.role)}
								icon={<PageIcon active={pathname === `/docs/${document.id}`} />}
								onNavigate={onNavigate}
							/>
						))}
					</div>
				) : deferredQuery ? (
					<div className='space-y-1'>
						<SectionTitle collapsed={collapsed}>搜索结果</SectionTitle>
						{filteredDocuments.length === 0 ? (
							<p className='px-3 py-2 text-sm text-muted'>没有匹配的页面</p>
						) : (
							filteredDocuments.map((document) => (
								<NavLink
									key={document.id}
									href={`/docs/${document.id}`}
									active={pathname === `/docs/${document.id}`}
									collapsed={false}
									title={document.title}
									subtitle={
										document.parentId ? '子页面' : roleLabel(document.role)
									}
									icon={
										<PageIcon active={pathname === `/docs/${document.id}`} />
									}
									onNavigate={onNavigate}
								/>
							))
						)}
					</div>
				) : (
					<>
						{favoriteDocuments.length > 0 ? (
							<div className='space-y-1'>
								<SectionTitle collapsed={collapsed}>收藏</SectionTitle>
								{favoriteDocuments.map((document) => (
									<NavLink
										key={document.id}
										href={`/docs/${document.id}`}
										active={pathname === `/docs/${document.id}`}
										collapsed={false}
										title={document.title}
										subtitle={roleLabel(document.role)}
										icon={
											<PageIcon active={pathname === `/docs/${document.id}`} />
										}
										onNavigate={onNavigate}
									/>
								))}
							</div>
						) : null}

						<div className='space-y-2'>
							<SectionTitle collapsed={collapsed}>页面</SectionTitle>
							{!isPending ? (
								<div
									onDragOver={(event) => {
										if (!draggedDocumentId) {
											return;
										}

										event.preventDefault();
										setIsRootDropTarget(true);
										setDropTargetId(null);
									}}
									onDragLeave={() => {
										setIsRootDropTarget(false);
									}}
									onDrop={() => {
										if (!draggedDocumentId) {
											return;
										}

										moveDraggedDocument(null);
									}}
									className={cn(
										'mx-3 rounded-2xl border border-dashed px-3 py-2 text-xs text-muted transition',
										isRootDropTarget
											? 'border-black/18 bg-black/[0.045] text-foreground'
											: 'border-transparent bg-black/[0.02]',
									)}
								>
									拖到这里可移动到根层级
								</div>
							) : null}
							{activeDocuments.length === 0 ? (
								<p className='px-3 py-2 text-sm text-muted'>没有可显示的页面</p>
							) : (
								renderTree(null)
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
