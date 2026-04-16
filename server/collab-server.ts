import 'dotenv/config';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';

async function main() {
	const { prisma } = await import('../src/lib/db');
	const { verifyCollabToken } = await import('../src/lib/collab');
	const { maybeCreateDocumentVersionSnapshot } =
		await import('../src/lib/document-versions');
	const port = Number(process.env.COLLAB_PORT || 1234);

	const server = new Server({
		port,
		address: '0.0.0.0',
		debounce: 1000,
		maxDebounce: 5000,
		async onAuthenticate(data) {
			const payload = await verifyCollabToken(data.token);

			if (payload.documentId !== data.documentName) {
				throw new Error('无效的协同令牌');
			}

			data.connectionConfig.readOnly = payload.role === 'viewer';

			return {
				...payload,
				user: payload,
			};
		},
		async onLoadDocument(data) {
			const persisted = await prisma.document.findUnique({
				where: { id: data.documentName },
				select: { ydocState: true },
			});

			if (!persisted) {
				throw new Error('文档不存在');
			}

			const doc = new Y.Doc();

			if (persisted.ydocState) {
				Y.applyUpdate(doc, new Uint8Array(persisted.ydocState));
			}

			return doc;
		},
		async onStoreDocument(data) {
			const update = Y.encodeStateAsUpdate(data.document);
			const lastEditedById = data.context?.userId ?? data.context?.user?.userId;

			await prisma.document.update({
				where: { id: data.documentName },
				data: {
					ydocState: Buffer.from(update),
					updatedAt: new Date(),
					lastEditedById,
				},
			});

			await maybeCreateDocumentVersionSnapshot({
				documentId: data.documentName,
				createdById: lastEditedById ?? null,
				source: 'edit',
			});
		},
	});

	await server.listen();
	console.log(`协同服务已启动: ws://localhost:${port}`);
}

main().catch((error) => {
	console.error('协同服务启动失败:', error);
	process.exit(1);
});
