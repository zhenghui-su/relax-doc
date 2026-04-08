import { logoutAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';

export function LogoutButton({ className }: { className?: string }) {
	return (
		<form action={logoutAction}>
			<SubmitButton
				className={cn(
					'h-9 rounded-full bg-[#151515] px-3 shadow-none hover:bg-black',
					className,
				)}
				pendingLabel='退出中...'
			>
				退出登录
			</SubmitButton>
		</form>
	);
}
