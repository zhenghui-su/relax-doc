'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDocumentTitleAction } from '@/app/actions/documents';
import { SubmitButton } from '@/components/ui/submit-button';
import { emptyFormState } from '@/lib/auth/validation';
import { showToast } from '@/lib/toast';

type TitleFormProps = {
	documentId: string;
	initialTitle: string;
	canEdit: boolean;
	compact?: boolean;
};

export function TitleForm({
	documentId,
	initialTitle,
	canEdit,
	compact = false,
}: TitleFormProps) {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement | null>(null);
	const lastSavedTitleRef = useRef(initialTitle);
	const [draftTitle, setDraftTitle] = useState(initialTitle);
	const [state, action] = useActionState(
		updateDocumentTitleAction,
		emptyFormState,
	);

	useEffect(() => {
		if (state.ok) {
			lastSavedTitleRef.current = draftTitle.trim() || initialTitle;
			showToast({
				message: state.message || '标题已保存',
				variant: 'success',
			});
			router.refresh();
			return;
		}

		if (state.message) {
			showToast({
				message: state.message,
				variant: 'error',
			});
		}
	}, [draftTitle, initialTitle, router, state.message, state.ok]);

	function submitIfChanged() {
		const nextTitle = draftTitle.trim();

		if (!compact || !canEdit) {
			return;
		}

		if (!nextTitle || nextTitle === lastSavedTitleRef.current) {
			return;
		}

		formRef.current?.requestSubmit();
	}

	return (
		<form
			ref={formRef}
			action={action}
			className={compact ? 'min-w-0' : 'space-y-4'}
		>
			<input type='hidden' name='documentId' value={documentId} />
			<div
				className={
					compact
						? 'flex min-w-0 items-center gap-2'
						: 'flex flex-col gap-3 lg:flex-row lg:items-center'
				}
			>
				<input
					name='title'
					value={draftTitle}
					onChange={(event) => setDraftTitle(event.target.value)}
					onBlur={submitIfChanged}
					onKeyDown={(event) => {
						if (compact && event.key === 'Enter') {
							event.preventDefault();
							submitIfChanged();
							(event.currentTarget as HTMLInputElement).blur();
						}
					}}
					disabled={!canEdit}
					className={
						compact
							? 'h-9 min-w-0 flex-1 rounded-xl bg-transparent px-0 text-[1.05rem] font-semibold tracking-[-0.03em] text-foreground outline-none disabled:cursor-not-allowed disabled:text-muted'
							: 'input-field focus-ring h-14 flex-1 rounded-[20px] bg-white/78 px-5 text-3xl font-semibold tracking-[-0.04em] text-foreground shadow-none'
					}
				/>
				{canEdit && !compact ? (
					<SubmitButton
						className={compact ? 'h-9 rounded-lg px-3 shadow-none' : undefined}
						pendingLabel='更新中...'
					>
						保存
					</SubmitButton>
				) : !canEdit ? (
					<span className='inline-flex h-9 items-center rounded-full bg-black/[0.045] px-3 text-sm font-medium text-muted'>
						只读
					</span>
				) : null}
			</div>
			{!compact && state.message ? (
				<p className='text-sm text-muted'>{state.message}</p>
			) : null}
		</form>
	);
}
