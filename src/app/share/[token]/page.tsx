import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export default async function SharePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const session = await auth();

	if (!session?.user) {
		redirect(`/login?redirectTo=${encodeURIComponent(`/share/${token}`)}`);
	}

	const shareLink = await prisma.documentShareLink.findUnique({
		where: { token },
		select: {
			documentId: true,
			isActive: true,
		},
	});

	if (!shareLink?.isActive) {
		return (
			<div className='app-shell flex min-h-screen items-center justify-center px-6'>
				<div className='surface-card max-w-lg rounded-[32px] p-8 text-center'>
					<h1 className='text-2xl font-semibold text-foreground'>
						这个分享链接已不可用
					</h1>
					<p className='mt-3 leading-7 text-muted'>
						如果你仍然需要访问，请联系文档所有者重新创建链接
					</p>
				</div>
			</div>
		);
	}

	redirect(`/docs/${shareLink.documentId}?share=${token}`);
}
