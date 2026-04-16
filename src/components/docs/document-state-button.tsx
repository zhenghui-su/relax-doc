'use client';

import {
	useActionState,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { emptyFormState, type FormState } from '@/lib/auth/validation';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type DocumentStateButtonProps = {
	action: (previousState: FormState, formData: FormData) => Promise<FormState>;
	documentId: string;
	label: string;
	active?: boolean;
	icon: ReactNode;
	variant?: 'default' | 'icon' | 'menu';
	title?: string;
	successHref?: string;
	confirm?: {
		title: string;
		description: string;
		confirmLabel: string;
	};
};

export function DocumentStateButton({
	action,
	documentId,
	label,
	active = false,
	icon,
	variant = 'default',
	title,
	successHref,
	confirm,
}: DocumentStateButtonProps) {
	const router = useRouter();
	const [state, formAction] = useActionState(action, emptyFormState);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const rootRef = useRef<HTMLFormElement | null>(null);

	useEffect(() => {
		if (!state.ok) {
			if (state.message) {
				showToast({
					message: state.message,
					variant: 'error',
				});
			}
			return;
		}

		showToast({
			message: state.message || '操作已完成',
			variant: 'success',
		});
		if (successHref) {
			router.push(successHref);
			return;
		}

		router.refresh();
	}, [router, state.message, state.ok, successHref]);

	useEffect(() => {
		if (!confirmOpen) {
			return;
		}

		function handlePointerDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setConfirmOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setConfirmOpen(false);
			}
		}

		window.addEventListener('mousedown', handlePointerDown);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('mousedown', handlePointerDown);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [confirmOpen]);

	return (
		<form
			action={formAction}
			ref={rootRef}
			className='group/doc-action relative'
		>
			<input type='hidden' name='documentId' value={documentId} />
			<button
				type={confirm ? 'button' : 'submit'}
				onClick={
					confirm ? () => setConfirmOpen((current) => !current) : undefined
				}
				aria-label={title || label}
				title={title || label}
				className={cn(
					'inline-flex items-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/6',
					variant === 'icon'
						? 'h-8 w-8 justify-center text-muted'
						: variant === 'menu'
							? 'h-9 w-full justify-start gap-2 rounded-lg px-3 text-sm'
							: 'h-9 gap-2 px-3 text-sm',
					active
						? 'bg-black/[0.06] text-foreground'
						: 'text-muted hover:bg-black/[0.045] hover:text-foreground',
				)}
			>
				{icon}
				{variant === 'icon' ? <span className='sr-only'>{label}</span> : label}
			</button>

			{variant === 'icon' && !confirmOpen ? (
				<span className='pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-lg bg-[#151515] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition group-hover/doc-action:opacity-100 group-focus-within/doc-action:opacity-100'>
					{title || label}
				</span>
			) : null}

			{confirmOpen && confirm ? (
				<div className='absolute right-0 top-full z-30 mt-2 w-[220px] rounded-[18px] border border-black/8 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]'>
					<p className='text-sm font-semibold text-foreground'>
						{confirm.title}
					</p>
					<p className='mt-1 text-xs leading-5 text-muted'>
						{confirm.description}
					</p>
					<div className='mt-3 flex items-center justify-end gap-2'>
						<button
							type='button'
							onClick={() => setConfirmOpen(false)}
							className='inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium text-muted transition hover:bg-black/[0.04] hover:text-foreground'
						>
							取消
						</button>
						<button
							type='submit'
							onClick={() => setConfirmOpen(false)}
							className='inline-flex h-8 items-center justify-center rounded-lg bg-[#151515] px-2.5 text-xs font-medium text-white transition hover:bg-black'
						>
							{confirm.confirmLabel}
						</button>
					</div>
				</div>
			) : null}
		</form>
	);
}
