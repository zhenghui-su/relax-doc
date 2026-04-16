import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import { ToastViewport } from '@/components/ui/toast-viewport';

export const metadata: Metadata = {
	title: 'Relax Doc 协同文档',
	description: '支持实时协同编辑、分享与权限控制的文档应用',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='zh-CN' className='h-full antialiased'>
			<body className='min-h-full bg-background text-foreground'>
				<AntdRegistry>
					{children}
					<ToastViewport />
				</AntdRegistry>
			</body>
		</html>
	);
}
