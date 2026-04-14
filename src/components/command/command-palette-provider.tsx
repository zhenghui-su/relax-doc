'use client';

import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  moveDocumentToTrashAction,
  quickCreateDocumentAction,
  restoreDocumentAction,
  toggleArchiveDocumentAction,
  toggleFavoriteDocumentAction,
} from "@/app/actions/documents";
import { ModalShell } from "@/components/ui/modal-shell";
import { emptyFormState, type FormState } from "@/lib/auth/validation";
import { showToast } from "@/lib/toast";
import { cn, roleLabel } from "@/lib/utils";
import { type DocumentListItem } from "@/types/document";

type CurrentDocumentContext = {
  documentId: string;
  title: string;
  canEdit: boolean;
  canShare: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isFavorite: boolean;
  role: "owner" | "editor" | "viewer";
};

type CommandPaletteContextValue = {
  openPalette: () => void;
  closePalette: () => void;
  setCurrentDocument: (document: CurrentDocumentContext | null) => void;
};

type PaletteItem = {
  id: string;
  section: string;
  title: string;
  subtitle?: string;
  meta?: string;
  keywords: string;
  icon: ReactNode;
  destructive?: boolean;
  action: () => void | Promise<void>;
};

type DocumentAction = (
  previousState: FormState,
  formData: FormData,
) => Promise<FormState>;

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="m14.25 14.25 3.25 3.25M15.5 9A6.5 6.5 0 1 1 2.5 9a6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M6 3.75h5.3c.2 0 .39.08.53.22l2.2 2.2c.14.14.22.33.22.53V15.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-11A.75.75 0 0 1 6 3.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 3.95V6.5h2.55"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 4.25v11.5M4.25 10h11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} className="h-4 w-4">
      <path
        d="m10 2.9 2.16 4.38 4.84.7-3.5 3.4.83 4.81L10 14.3 5.67 16.2l.83-4.81L3 7.98l4.84-.7L10 2.9Z"
        stroke="currentColor"
        strokeWidth={filled ? "0" : "1.45"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M4.75 5.25h10.5l-.75 9a1 1 0 0 1-1 .92h-7a1 1 0 0 1-1-.92l-.75-9ZM4 5.25V4a.75.75 0 0 1 .75-.75h10.5A.75.75 0 0 1 16 4v1.25M8 9.25h4"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M5.75 6.25h8.5m-7.5 0 .55 8.1c.03.52.47.92 1 .92h3.4c.53 0 .97-.4 1-.92l.55-8.1M8 6.25V5a.75.75 0 0 1 .75-.75h2.5A.75.75 0 0 1 12 5v1.25"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SharedIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M6.75 8.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13.25 9.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 15.25a2.75 2.75 0 0 1 5.5 0v.5H4v-.5ZM10.5 15.75v-.5a2.75 2.75 0 0 1 5.5 0v.5h-5.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommandHint({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-black/8 bg-[#f7f7f6] px-2 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}

function formatRelativeTime(value: Date) {
  const now = Date.now();
  const diff = now - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  }

  if (diff < 30 * day) {
    return `${Math.max(1, Math.floor(diff / day))} 天前`;
  }

  const target = new Date(value);
  const nowDate = new Date(now);

  if (nowDate.getFullYear() === target.getFullYear()) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
    }).format(target);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(target);
}

function getDocumentPath(
  document: DocumentListItem,
  documentMap: Map<string, DocumentListItem>,
) {
  const segments: string[] = [];
  let currentId = document.parentId;
  let guard = 0;

  while (currentId && guard < 12) {
    const parent = documentMap.get(currentId);

    if (!parent) {
      break;
    }

    segments.unshift(parent.title);
    currentId = parent.parentId;
    guard += 1;
  }

  return segments.join(" / ");
}

function matchesQuery(value: string, query: string) {
  if (!query) {
    return true;
  }

  return value.includes(query);
}

async function invokeDocumentAction(action: DocumentAction, documentId: string) {
  const formData = new FormData();
  formData.set("documentId", documentId);
  return action(emptyFormState, formData);
}

function CommandPaletteLayer({
  documents,
  currentDocument,
  onClose,
}: {
  documents: DocumentListItem[];
  currentDocument: CurrentDocumentContext | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const searchParamsKey = searchParams.toString();
  const initialRouteKeyRef = useRef(`${pathname}?${searchParamsKey}`);

  useEffect(() => {
    const routeKey = `${pathname}?${searchParamsKey}`;

    if (routeKey === initialRouteKeyRef.current) {
      return;
    }

    onClose();
  }, [onClose, pathname, searchParamsKey]);

  const documentMap = useMemo(() => {
    return new Map(documents.map((document) => [document.id, document]));
  }, [documents]);

  const indexedDocuments = useMemo(() => {
    return documents.map((document) => {
      const path = getDocumentPath(document, documentMap);
      const stateLabel = document.deletedAt
        ? "回收站"
        : (document.isArchived ? "已归档" : roleLabel(document.role));
      const favoriteLabel = document.isFavorite ? " 已收藏" : "";

      return {
        document,
        path,
        meta: `${stateLabel}${favoriteLabel ? ` · ${favoriteLabel.trim()}` : ""}`,
        searchText: [
          document.title,
          path,
          stateLabel,
          favoriteLabel,
          roleLabel(document.role),
        ]
          .join(" ")
          .toLowerCase(),
      };
    });
  }, [documentMap, documents]);

  function navigateTo(href: string) {
    onClose();
    router.push(href);
  }

  function executeMutation(
    action: DocumentAction,
    documentId: string,
    options?: {
      successHref?: string;
    },
  ) {
    onClose();
    startTransition(async () => {
      const result = await invokeDocumentAction(action, documentId);

      if (!result.ok) {
        showToast({
          message: result.message || "操作失败。",
          variant: "error",
        });
        return;
      }

      showToast({
        message: result.message || "操作已完成。",
        variant: "success",
      });

      if (options?.successHref) {
        router.push(options.successHref);
        return;
      }

      router.refresh();
    });
  }

  function executeQuickCreate(parentId?: string | null) {
    onClose();
    startTransition(async () => {
      const result = await quickCreateDocumentAction({
        parentId: parentId ?? null,
      });

      if (!result.ok || typeof result.data?.documentId !== "string") {
        showToast({
          message: result.message || "创建文档失败。",
          variant: "error",
        });
        return;
      }

      showToast({
        message: result.message || "文档已创建。",
        variant: "success",
      });
      router.push(`/docs/${result.data.documentId}`);
    });
  }

  const viewItems = [
    {
      id: "view-all",
      section: "跳转",
      title: "打开全部文档",
      subtitle: "进入主文档空间视图",
      meta: pathname === "/docs" && !searchParams.get("view") ? "当前" : undefined,
      keywords: "全部 文档 空间 首页 recent all docs",
      icon: <FileIcon />,
      action: () => navigateTo("/docs"),
    },
    {
      id: "view-favorites",
      section: "跳转",
      title: "打开收藏",
      subtitle: "查看你标记的常用页面",
      meta: searchParams.get("view") === "favorites" ? "当前" : undefined,
      keywords: "收藏 favorites starred 星标",
      icon: <StarIcon filled />,
      action: () => navigateTo("/docs?view=favorites"),
    },
    {
      id: "view-shared",
      section: "跳转",
      title: "打开共享给我",
      subtitle: "查看成员共享给你的页面",
      meta: searchParams.get("view") === "shared" ? "当前" : undefined,
      keywords: "共享 分享 协作 shared with me",
      icon: <SharedIcon />,
      action: () => navigateTo("/docs?view=shared"),
    },
    {
      id: "view-archived",
      section: "跳转",
      title: "打开已归档",
      subtitle: "查看已隐藏的页面",
      meta: searchParams.get("view") === "archived" ? "当前" : undefined,
      keywords: "归档 archived hidden",
      icon: <ArchiveIcon />,
      action: () => navigateTo("/docs?view=archived"),
    },
    {
      id: "view-trash",
      section: "跳转",
      title: "打开回收站",
      subtitle: "恢复或彻底删除页面",
      meta: searchParams.get("view") === "trash" ? "当前" : undefined,
      keywords: "回收站 删除 trash deleted",
      icon: <TrashIcon />,
      action: () => navigateTo("/docs?view=trash"),
    },
  ].filter((item) => matchesQuery(`${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase(), deferredQuery)) satisfies PaletteItem[];

  const createItems = [
    {
      id: "create-root",
      section: "新建",
      title: "新建文档",
      subtitle: "在根层级创建一个空白页面",
      keywords: "新建 创建 文档 页面 create new page root",
      icon: <PlusIcon />,
      action: () => executeQuickCreate(null),
    },
    ...(currentDocument?.canEdit && !currentDocument.isDeleted
      ? [
          {
            id: "create-child",
            section: "新建",
            title: "新建子页面",
            subtitle: `在“${currentDocument.title}”下创建子页面`,
            keywords: "子页面 嵌套 层级 create child subpage",
            icon: <PlusIcon />,
            action: () => executeQuickCreate(currentDocument.documentId),
          },
        ]
      : []),
  ].filter((item) => matchesQuery(`${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase(), deferredQuery)) satisfies PaletteItem[];

  const currentDocumentItems = currentDocument
    ? [
        {
          id: "current-open",
          section: "当前文档",
          title: "重新打开当前文档",
          subtitle: currentDocument.title,
          keywords: "当前 文档 重新打开 open current document",
          icon: <FileIcon />,
          action: () => navigateTo(`/docs/${currentDocument.documentId}`),
        },
        ...(!currentDocument.isDeleted
          ? [
              {
                id: "current-favorite",
                section: "当前文档",
                title: currentDocument.isFavorite ? "取消收藏当前文档" : "收藏当前文档",
                subtitle: currentDocument.isFavorite ? "从收藏中移除" : "加入收藏列表",
                keywords: "收藏 星标 favorite current document",
                icon: <StarIcon filled={currentDocument.isFavorite} />,
                action: () => executeMutation(toggleFavoriteDocumentAction, currentDocument.documentId),
              },
            ]
          : []),
        ...(currentDocument.canEdit && !currentDocument.isDeleted
          ? [
              {
                id: "current-archive",
                section: "当前文档",
                title: currentDocument.isArchived ? "恢复当前文档" : "归档当前文档",
                subtitle: currentDocument.isArchived ? "让页面重新出现在主导航中" : "从主导航隐藏，但保留内容",
                keywords: "归档 恢复 archive restore current document",
                icon: <ArchiveIcon />,
                action: () => executeMutation(toggleArchiveDocumentAction, currentDocument.documentId),
              },
              {
                id: "current-trash",
                section: "当前文档",
                title: "移到回收站",
                subtitle: "文档会从主导航中隐藏",
                keywords: "回收站 删除 trash remove delete current document",
                icon: <TrashIcon />,
                destructive: true,
                action: () =>
                  executeMutation(moveDocumentToTrashAction, currentDocument.documentId, {
                    successHref: "/docs?view=trash",
                  }),
              },
            ]
          : []),
        ...(currentDocument.canEdit && currentDocument.isDeleted
          ? [
              {
                id: "current-restore",
                section: "当前文档",
                title: "从回收站恢复",
                subtitle: "恢复后文档会重新回到主导航",
                keywords: "恢复 回收站 restore deleted current document",
                icon: <ArchiveIcon />,
                action: () => executeMutation(restoreDocumentAction, currentDocument.documentId),
              },
            ]
          : []),
      ].filter((item) => matchesQuery(`${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase(), deferredQuery)) satisfies PaletteItem[]
    : [];

  const documentItems = (
    deferredQuery
      ? indexedDocuments.filter((item) => matchesQuery(item.searchText, deferredQuery))
      : indexedDocuments.slice(0, 8)
  )
    .slice(0, 10)
    .map((item) => ({
      id: `document-${item.document.id}`,
      section: deferredQuery ? "搜索结果" : "最近文档",
      title: item.document.title,
      subtitle: item.path
        ? `${item.path} · 最后编辑 ${formatRelativeTime(item.document.updatedAt)}`
        : `最后编辑 ${formatRelativeTime(item.document.updatedAt)}`,
      meta: item.meta,
      keywords: item.searchText,
      icon: <FileIcon />,
      action: () => navigateTo(`/docs/${item.document.id}`),
    })) satisfies PaletteItem[];

  const sections = Array.from(
    [
      ...documentItems,
      ...createItems,
      ...currentDocumentItems,
      ...viewItems,
    ].reduce((acc, item) => {
      const current = acc.get(item.section) ?? [];
      current.push(item);
      acc.set(item.section, current);
      return acc;
    }, new Map<string, PaletteItem[]>()),
  ).map(([label, items]) => ({
    label,
    items,
  }));

  const flatItems = sections.flatMap((section) => section.items);
  const activeIndex = flatItems.length === 0
    ? 0
    : Math.min(selectedIndex, flatItems.length - 1);

  useEffect(() => {
    const selected = document.querySelector<HTMLElement>(`[data-command-index="${activeIndex}"]`);
    selected?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  return (
    <ModalShell
      onClose={onClose}
      className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-black/8 bg-white/98 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
    >
      <div className="flex flex-col">
        <div className="border-b border-black/6 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f3] text-muted">
              <SearchIcon />
            </span>
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((current) => {
                    if (flatItems.length === 0) {
                      return 0;
                    }

                    return (current + 1) % flatItems.length;
                  });
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((current) => {
                    if (flatItems.length === 0) {
                      return 0;
                    }

                    return (current - 1 + flatItems.length) % flatItems.length;
                  });
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  const selected = flatItems[activeIndex];
                  if (selected) {
                    void selected.action();
                  }
                }
              }}
              placeholder="搜索文档、跳转视图或执行命令"
              className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
            />
            <CommandHint>Esc</CommandHint>
          </div>
        </div>

        <div className="max-h-[min(70vh,620px)] overflow-y-auto px-2 py-2">
          {sections.length > 0 ? (
            sections.map((section) => (
              <div key={section.label} className="px-1 py-1">
                <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const index = flatItems.findIndex((candidate) => candidate.id === item.id);
                    const selected = index === activeIndex;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-command-index={index}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => {
                          void item.action();
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                          selected
                            ? "bg-[#151515] text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
                            : "text-foreground hover:bg-black/[0.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex size-9 shrink-0 items-center justify-center rounded-2xl",
                            selected
                              ? "bg-white/12 text-white"
                              : "bg-[#f5f5f3] text-muted",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{item.title}</span>
                            {item.meta ? (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  selected
                                    ? "bg-white/12 text-white/82"
                                    : "bg-black/[0.045] text-muted",
                                  item.destructive && !selected && "bg-[#fff1ee] text-[#b94728]",
                                )}
                              >
                                {item.meta}
                              </span>
                            ) : null}
                          </span>
                          {item.subtitle ? (
                            <span
                              className={cn(
                                "mt-1 block truncate text-xs",
                                selected ? "text-white/70" : "text-muted",
                              )}
                            >
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">没有匹配内容</p>
              <p className="text-sm text-muted">试试输入文档标题、收藏、归档、回收站等关键词。</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-black/6 px-4 py-3 text-xs text-muted sm:px-5">
          <span>{isPending ? "正在执行命令..." : "输入关键词即可筛选文档与操作"}</span>
          <div className="flex items-center gap-2">
            <CommandHint>↑↓</CommandHint>
            <CommandHint>Enter</CommandHint>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function CommandPaletteProvider({
  documents,
  children,
}: {
  documents: DocumentListItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<CurrentDocumentContext | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const value = useMemo<CommandPaletteContextValue>(() => {
    return {
      openPalette: () => setOpen(true),
      closePalette: () => setOpen(false),
      setCurrentDocument,
    };
  }, []);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {open ? (
        <CommandPaletteLayer
          documents={documents}
          currentDocument={currentDocument}
          onClose={value.closePalette}
        />
      ) : null}
    </CommandPaletteContext.Provider>
  );
}

export function CommandPaletteTrigger() {
  const context = useContext(CommandPaletteContext);

  if (!context) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={context.openPalette}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/8 bg-white/88 px-3 text-sm text-muted shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:bg-white hover:text-foreground"
      aria-label="打开搜索和命令面板"
    >
      <SearchIcon />
      <span className="hidden sm:inline">搜索</span>
      <span className="hidden items-center gap-1 text-[11px] font-medium text-muted lg:inline-flex">
        <CommandHint>⌘K</CommandHint>
      </span>
    </button>
  );
}

export function CommandPaletteRegistration({
  document,
}: {
  document: CurrentDocumentContext;
}) {
  const context = useContext(CommandPaletteContext);

  useEffect(() => {
    context?.setCurrentDocument(document);

    return () => {
      context?.setCurrentDocument(null);
    };
  }, [context, document]);

  return null;
}
