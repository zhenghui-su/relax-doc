import { DocumentVersionSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const MAX_DOCUMENT_VERSIONS = 18;

function byteArrayEquals(a: Uint8Array | null, b: Uint8Array | null) {
  if (a === b) {
    return true;
  }

  if (!a || !b || a.byteLength !== b.byteLength) {
    return false;
  }

  for (let index = 0; index < a.byteLength; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

async function pruneDocumentVersions(documentId: string, maxVersions = MAX_DOCUMENT_VERSIONS) {
  const staleVersions = await prisma.documentVersion.findMany({
    where: {
      documentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: maxVersions,
    select: {
      id: true,
    },
  });

  if (staleVersions.length === 0) {
    return;
  }

  await prisma.documentVersion.deleteMany({
    where: {
      id: {
        in: staleVersions.map((version) => version.id),
      },
    },
  });
}

export async function createDocumentVersionSnapshot(options: {
  documentId: string;
  createdById?: string | null;
  source?: DocumentVersionSource;
  metadata?: Prisma.InputJsonValue;
  dedupeLatest?: boolean;
  maxVersions?: number;
}) {
  const [document, lastVersion] = await Promise.all([
    prisma.document.findUnique({
      where: { id: options.documentId },
      select: {
        id: true,
        title: true,
        ydocState: true,
      },
    }),
    options.dedupeLatest
      ? prisma.documentVersion.findFirst({
          where: { documentId: options.documentId },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            title: true,
            ydocState: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!document) {
    return null;
  }

  if (
    options.dedupeLatest
    && lastVersion
    && lastVersion.title === document.title
    && byteArrayEquals(lastVersion.ydocState, document.ydocState)
  ) {
    return null;
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      createdById: options.createdById ?? null,
      title: document.title,
      ydocState: document.ydocState ?? null,
      source: options.source ?? "edit",
      ...(typeof options.metadata === "undefined"
        ? {}
        : {
            metadata: options.metadata,
          }),
    },
  });

  await pruneDocumentVersions(document.id, options.maxVersions);

  return version;
}

export async function maybeCreateDocumentVersionSnapshot(options: {
  documentId: string;
  createdById?: string | null;
  source?: DocumentVersionSource;
  minimumIntervalMs?: number;
  maxVersions?: number;
}) {
  const minimumIntervalMs = options.minimumIntervalMs ?? 3 * 60 * 1000;

  const [document, lastVersion] = await Promise.all([
    prisma.document.findUnique({
      where: { id: options.documentId },
      select: {
        id: true,
        title: true,
        ydocState: true,
      },
    }),
    prisma.documentVersion.findFirst({
      where: { documentId: options.documentId },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        title: true,
        ydocState: true,
        createdAt: true,
      },
    }),
  ]);

  if (!document) {
    return null;
  }

  if (lastVersion) {
    const isSameTitle = lastVersion.title === document.title;
    const isSameState = byteArrayEquals(lastVersion.ydocState, document.ydocState);
    const isTooSoon = Date.now() - lastVersion.createdAt.getTime() < minimumIntervalMs;

    if (isSameTitle && isSameState) {
      return null;
    }

    if (isTooSoon) {
      return null;
    }
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      createdById: options.createdById ?? null,
      title: document.title,
      ydocState: document.ydocState ?? null,
      source: options.source ?? "edit",
    },
  });

  await pruneDocumentVersions(document.id, options.maxVersions);

  return version;
}

export async function getDocumentVersions(options: {
  documentId: string;
  userId: string;
  shareToken?: string | null;
}) {
  const { getDocumentAccess } = await import("@/lib/documents");
  const access = await getDocumentAccess(options);

  if (!access || access.source !== "member") {
    return null;
  }

  return prisma.documentVersion.findMany({
    where: {
      documentId: options.documentId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
  });
}
