export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className='relative min-h-screen overflow-hidden bg-[#f6f5f2]'>
			<div className='pointer-events-none absolute inset-0'>
				<div className='absolute left-[-10%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.96)_0%,_rgba(255,255,255,0)_68%)]' />
				<div className='absolute bottom-[-16%] right-[-4%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(21,21,21,0.08)_0%,_rgba(21,21,21,0)_68%)]' />
				<div className='absolute inset-x-0 top-0 h-px bg-black/6' />
			</div>

			<div className='relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8'>
				<div className='grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]'>
					<section className='hidden rounded-[40px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,247,245,0.9)_100%)] p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] lg:flex lg:flex-col lg:justify-between'>
						<div className='space-y-5'>
							<span className='inline-flex items-center rounded-full border border-black/8 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted'>
								Relax Doc
							</span>
							<div className='space-y-4'>
								<h1 className='max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-foreground'>
									让文档更高效
								</h1>
								<p className='max-w-md text-base leading-7 text-muted'>
									更少解释，更少干扰。直接进入文档空间开始工作。
								</p>
							</div>
						</div>

						<div className='space-y-4'>
							<div className='rounded-[30px] border border-black/8 bg-white/92 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]'>
								<div className='flex items-center justify-between'>
									<span className='text-sm font-semibold text-foreground'>
										产品规划
									</span>
									<span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700'>
										Auto saved
									</span>
								</div>
								<div className='mt-4 space-y-3'>
									<div className='h-3 w-2/3 rounded-full bg-black/[0.08]' />
									<div className='h-3 w-full rounded-full bg-black/[0.06]' />
									<div className='h-3 w-5/6 rounded-full bg-black/[0.06]' />
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div className='rounded-[28px] border border-black/8 bg-white/85 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]'>
									<p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted'>
										Presence
									</p>
									<div className='mt-4 flex items-center'>
										<span className='inline-flex size-9 items-center justify-center rounded-full bg-[#151515] text-xs font-semibold text-white'>
											A
										</span>
										<span className='-ml-2 inline-flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#2563eb] text-xs font-semibold text-white'>
											L
										</span>
										<span className='-ml-2 inline-flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#ea580c] text-xs font-semibold text-white'>
											M
										</span>
									</div>
								</div>
								<div className='rounded-[28px] border border-black/8 bg-[#151515] p-4 text-white shadow-[0_20px_40px_rgba(15,23,42,0.12)]'>
									<p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56'>
										Sharing
									</p>
									<p className='mt-4 text-sm font-medium text-white/84'>
										Viewer link active
									</p>
								</div>
							</div>
						</div>
					</section>

					<section className='surface-card relative mx-auto w-full max-w-[460px] rounded-[36px] border border-black/8 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:p-8'>
						<div className='absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_50%,rgba(0,0,0,0)_100%)]' />
						<div className='mx-auto w-full max-w-sm'>{children}</div>
					</section>
				</div>
			</div>
		</div>
	);
}
