'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { cn } from "@/lib/utils";

type CollabUser = {
  id: string;
  name: string;
  email: string;
  color: string;
};

type CollabBootstrap = {
  token: string;
  url: string;
  role: "owner" | "editor" | "viewer";
  user: CollabUser;
};

type CollaborativeEditorProps = {
  documentId: string;
  shareToken?: string;
  canEdit: boolean;
};

type ToolbarButton = {
  id: string;
  label: string;
  run: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
  icon: (active: boolean) => ReactNode;
};

type EditorMetrics = {
  characters: number;
  words: number;
};

const toolbarButtons: ToolbarButton[] = [
  {
    id: "paragraph",
    label: "正文",
    run: (editor) => editor.chain().focus().setParagraph().run(),
    isActive: (editor) => editor.isActive("paragraph"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M6 5.25h5.25a3.25 3.25 0 1 1 0 6.5H9.5v3m2.5-9.5v9.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "bold",
    label: "粗体",
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive("bold"),
    icon: (active) => (
      <svg viewBox="0 0 20 20" fill="none" className={cn("h-4 w-4", active && "scale-105")}>
        <path
          d="M7 4.75h4.25a2.5 2.5 0 1 1 0 5H7v-5ZM7 9.75h5a2.75 2.75 0 1 1 0 5.5H7v-5.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "italic",
    label: "斜体",
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive("italic"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M11.75 4.75H8.5m3 0L8.25 15.25m0 0H5m3.25 0h3.25"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "strike",
    label: "删除线",
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive("strike"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M5 6.5c.85-.83 2.02-1.25 3.5-1.25 2.2 0 3.5.84 3.5 2.25 0 1.09-.78 1.76-2.33 2M4.5 10h11m-8.5 3.5c.76.83 1.9 1.25 3.4 1.25 2.28 0 3.6-.88 3.6-2.4 0-1.12-.82-1.81-2.45-2.08"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "heading-1",
    label: "一级标题",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M4.75 4.75v10.5M10.25 4.75v10.5M4.75 10h5.5m3-3.25 2-1.5v10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "heading-2",
    label: "二级标题",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M4.75 4.75v10.5M10.25 4.75v10.5M4.75 10h5.5m2.75-2c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1-.5 1.78-1.4 2.62l-2.35 2.13h3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "heading-3",
    label: "三级标题",
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M4.75 4.75v10.5M10.25 4.75v10.5M4.75 10h5.5m3.1-3c.75-.75 1.5-1 2.35-1 1.3 0 2.3.7 2.3 1.8 0 .9-.63 1.47-1.7 1.72 1.18.24 1.9.92 1.9 1.95 0 1.2-1.03 2.03-2.55 2.03-.97 0-1.83-.28-2.55-.82"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "bullet-list",
    label: "无序列表",
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive("bulletList"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M7.5 6h7m-7 4h7m-7 4h7M4.5 6h.01M4.5 10h.01M4.5 14h.01"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "ordered-list",
    label: "有序列表",
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive("orderedList"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M7.5 6h7m-7 4h7m-7 4h7M4.5 5.5v2M3.75 7.5H5.5m-1 5.5h1c.55 0 1-.45 1-1s-.45-1-1-1h-.5a1 1 0 0 0-1 1v0c0 .55.45 1 1 1h.5c.55 0 1 .45 1 1v0a1 1 0 0 1-1 1H4"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "blockquote",
    label: "引用",
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive("blockquote"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M6 7.25H4.75A1.75 1.75 0 0 0 3 9v2.25A1.75 1.75 0 0 0 4.75 13H6V7.25ZM13.75 7.25H12.5A1.75 1.75 0 0 0 10.75 9v2.25A1.75 1.75 0 0 0 12.5 13h1.25V7.25Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "inline-code",
    label: "行内代码",
    run: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive("code"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="m7.5 7-3 3 3 3m5-6 3 3-3 3"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "code-block",
    label: "代码块",
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive("codeBlock"),
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="m7.25 6-3.5 4 3.5 4m5.5-8 3.5 4-3.5 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "divider",
    label: "分割线",
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    isActive: () => false,
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M4 10h12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "clear-format",
    label: "清除格式",
    run: (editor) => {
      editor.chain().focus().clearNodes().unsetAllMarks().run();
    },
    isActive: () => false,
    icon: () => (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="m5.5 5.5 9 9M7 14.5h6.5M9 4.75h6.25M6.5 8l3.25-3.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

function getParticipantInitials(participant: Pick<CollabUser, "name" | "email">) {
  const source = participant.name?.trim() || participant.email;
  return Array.from(source)[0]?.toUpperCase() ?? "?";
}

function getParticipantName(participant: Pick<CollabUser, "name" | "email">) {
  return participant.name?.trim() || participant.email.split("@")[0] || "访客";
}

function getStatusLabel(status: string) {
  if (status === "connected") {
    return "已连接";
  }

  if (status === "connecting") {
    return "连接中";
  }

  return "已断开";
}

function getEditorMetrics(editor: Editor): EditorMetrics {
  const text = editor.getText().replace(/\s+/g, " ").trim();

  return {
    characters: text.length,
    words: text ? text.split(" ").length : 0,
  };
}

function EditorSurface({
  provider,
  ydoc,
  bootstrap,
  canEdit,
  participants,
  status,
}: {
  provider: HocuspocusProvider;
  ydoc: Y.Doc;
  bootstrap: CollabBootstrap;
  canEdit: boolean;
  participants: CollabUser[];
  status: string;
}) {
  const [metrics, setMetrics] = useState<EditorMetrics>({
    characters: 0,
    words: 0,
  });
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Collaboration.configure({
          document: ydoc,
        }),
        CollaborationCaret.configure({
          provider,
          user: bootstrap.user,
        }),
      ],
      editable: canEdit,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "ProseMirror min-h-[calc(100vh-19rem)] px-0 py-2 outline-none focus:outline-none focus-visible:outline-none",
        },
      },
    },
    [bootstrap.user.email, canEdit, provider, ydoc],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(canEdit);
  }, [canEdit, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.updateUser(bootstrap.user);
  }, [bootstrap.user, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentEditor = editor;

    function updateMetrics() {
      setMetrics(getEditorMetrics(currentEditor));
    }

    currentEditor.on("update", updateMetrics);
    window.setTimeout(updateMetrics, 0);

    return () => {
      currentEditor.off("update", updateMetrics);
    };
  }, [editor]);

  const onlineParticipants = participants.length > 0 ? participants : [bootstrap.user];
  const statusLabel = getStatusLabel(status);

  if (!editor) {
    return (
      <div className="surface-card border-x-0 rounded-none p-8 shadow-none">
        <p className="text-sm text-muted">编辑器启动中...</p>
      </div>
    );
  }

  return (
    <div className="editor-frame flex min-h-[calc(100vh-8.5rem)] flex-col overflow-visible rounded-none shadow-none">
      <div className="editor-toolbar sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="hide-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
          {toolbarButtons.map((item) => {
            const active = isToolbarActive(editor, item);

            return (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => item.run(editor)}
                  disabled={!canEdit}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition outline-none focus:outline-none focus-visible:outline-none",
                    active
                      ? "bg-[#151515] text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                      : "hover:bg-black/[0.05] hover:text-foreground",
                    !canEdit && "cursor-not-allowed opacity-45 hover:bg-transparent",
                  )}
                >
                  {item.icon(active)}
                </button>
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-lg bg-[#151515] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition group-hover:opacity-100 group-focus-within:opacity-100">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.045] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-muted">
            <span
              className={cn(
                "size-2 rounded-full",
                status === "connected"
                  ? "bg-emerald-500"
                  : status === "connecting"
                    ? "bg-amber-500"
                    : "bg-rose-500",
              )}
            />
            {statusLabel}
          </span>
          <div className="flex items-center">
            {onlineParticipants.map((participant, index) => (
              <span
                key={`${participant.email}-${participant.color}`}
                title={getParticipantName(participant)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)]",
                  index > 0 && "-ml-2.5",
                )}
                style={{ backgroundColor: participant.color }}
              >
                {getParticipantInitials(participant)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pb-10 pt-4 sm:px-8 lg:px-12">
        {!canEdit ? (
          <div className="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            当前为只读模式，内容仍会实时同步。
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between gap-3 bg-white px-5 py-2.5 text-xs text-muted sm:px-8 lg:px-12">
        <span>
          {metrics.words} 词
          <span className="mx-2 text-black/16">/</span>
          {metrics.characters} 字符
        </span>
        <span>{canEdit ? "编辑即同步" : "只读模式"}</span>
      </div>
    </div>
  );
}

function isToolbarActive(editor: Editor, item: ToolbarButton) {
  return item.isActive(editor);
}

export function CollaborativeEditor({
  documentId,
  shareToken,
  canEdit,
}: CollaborativeEditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [bootstrap, setBootstrap] = useState<CollabBootstrap | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [participants, setParticipants] = useState<CollabUser[]>([]);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let activeProvider: HocuspocusProvider | null = null;

    async function boot() {
      try {
        setError(null);
        setStatus("connecting");

        const search = shareToken ? `?share=${encodeURIComponent(shareToken)}` : "";
        const response = await fetch(`/api/documents/${documentId}/collab-token${search}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("初始化协同编辑失败。");
        }

        const data = (await response.json()) as CollabBootstrap;

        if (!data.url) {
          throw new Error("Collaboration server URL is missing.");
        }

        if (disposed) {
          return;
        }

        setBootstrap(data);

        activeProvider = new HocuspocusProvider({
          url: data.url,
          name: documentId,
          document: ydoc,
          token: data.token,
          onStatus: ({ status: nextStatus }) => setStatus(nextStatus),
          onAuthenticationFailed: ({ reason }) => {
            setError(reason || "Authentication failed.");
          },
          onAwarenessChange: ({ states }) => {
            const nextParticipants = states
              .map((state) => state.user)
              .filter(Boolean) as CollabUser[];

            setParticipants(nextParticipants);
          },
        });

        setProvider(activeProvider);
      } catch (caughtError) {
        if (!disposed) {
          setError(
            caughtError instanceof Error ? caughtError.message : "启动协同编辑失败。",
          );
        }
      }
    }

    void boot();

    return () => {
      disposed = true;
      activeProvider?.destroy();
      setProvider(null);
    };
  }, [documentId, shareToken, ydoc]);

  useEffect(() => {
    return () => {
      ydoc.destroy();
    };
  }, [ydoc]);

  if (error) {
    return (
      <div className="border border-x-0 border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">
        {error}
      </div>
    );
  }

  if (!bootstrap || !provider) {
    return (
      <div className="surface-card border-x-0 rounded-none px-6 py-8 shadow-none">
        <p className="text-sm text-muted">正在连接协同服务...</p>
      </div>
    );
  }

  return (
    <EditorSurface
      provider={provider}
      ydoc={ydoc}
      bootstrap={bootstrap}
      canEdit={canEdit}
      participants={participants}
      status={status}
    />
  );
}
