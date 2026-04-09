'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SidebarDocumentsNav } from "@/components/docs/sidebar-documents-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { type DocumentListItem } from "@/types/document";
import { cn } from "@/lib/utils";

const HeaderSlotContext = createContext<((content: ReactNode | null) => void) | null>(null);

function SidebarToggleIcon({
  collapsed,
  mobile = false,
}: {
  collapsed: boolean;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M4.5 6.5h11M4.5 10h11M4.5 13.5h11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")}
    >
      <path
        d="M12.5 5 7.5 10l5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("px-3 pb-2 pt-4", collapsed ? "px-2.5" : "px-3")}>
      <div className={cn("flex", collapsed ? "justify-center" : "justify-end")}>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-black/[0.045] hover:text-foreground"
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <SidebarToggleIcon collapsed={collapsed} />
        </button>
      </div>
    </div>
  );
}

function DesktopSidebar({
  collapsed,
  documents,
  onToggle,
}: {
  collapsed: boolean;
  documents: DocumentListItem[];
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "surface-sidebar hidden h-screen shrink-0 flex-col overflow-hidden transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        collapsed ? "w-[84px]" : "w-[280px]",
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={onToggle} />
      <div className="min-h-0 flex-1 px-2 pb-4">
        <SidebarDocumentsNav documents={documents} collapsed={collapsed} />
      </div>
    </aside>
  );
}

function MobileSidebar({
  documents,
  open,
  onClose,
}: {
  documents: DocumentListItem[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/26 backdrop-blur-[2px] transition-opacity duration-250",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "surface-sidebar absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col overflow-hidden border-r border-border shadow-[0_30px_80px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarHeader collapsed={false} onToggle={onClose} />
        <div className="min-h-0 flex-1 px-3 pb-4">
          <SidebarDocumentsNav documents={documents} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}

export function HeaderSlotProvider({
  fallback,
  userName,
  userEmail,
  documents,
  children,
}: {
  fallback: ReactNode;
  userName: string;
  userEmail: string;
  documents: DocumentListItem[];
  children: ReactNode;
}) {
  const [content, setContent] = useState<ReactNode | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <HeaderSlotContext.Provider value={setContent}>
      <div className="flex h-screen max-h-screen min-w-0 flex-1 overflow-hidden">
        <DesktopSidebar
          collapsed={collapsed}
          documents={documents}
          onToggle={() => setCollapsed((current) => !current)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-xl">
            <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-black/[0.045] hover:text-foreground lg:hidden"
                aria-label="打开侧边栏"
              >
                <SidebarToggleIcon collapsed={false} mobile />
              </button>

              <div className="min-w-0 flex-1">{content ?? fallback}</div>
              <UserMenu name={userName} email={userEmail} />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-0 py-0">
            {children}
          </main>
        </div>

        <MobileSidebar
          documents={documents}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </HeaderSlotContext.Provider>
  );
}

export function HeaderSlotRegistration({
  children,
}: {
  children: ReactNode;
}) {
  const setContent = useContext(HeaderSlotContext);

  useEffect(() => {
    setContent?.(children);

    return () => {
      setContent?.(null);
    };
  }, [children, setContent]);

  return null;
}
