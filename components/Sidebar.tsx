"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Beaker,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Settings,
  BarChart3,
  GitBranch,
  FlaskConical,
  HelpCircle,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SidebarNavItem {
  /** Display label */
  label: string;
  /** Route href */
  href: string;
  /** Lucide icon component */
  icon: React.ElementType;
  /** Optional badge text (e.g. "New", "Beta") */
  badge?: string;
  /** Whether this item is an external link */
  external?: boolean;
}

export interface SidebarSection {
  /** Section heading (optional — shown as small uppercase label) */
  heading?: string;
  /** Navigation items in this section */
  items: SidebarNavItem[];
}

export interface SidebarProps {
  /** Navigation sections to render */
  sections: SidebarSection[];
  /** Optional bottom section (user area, etc.) */
  footer?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Application name shown in the logo */
  appName?: string;
  /** Whether the sidebar is collapsed (compact mode) */
  collapsed?: boolean;
  /** Callback when collapse toggle is clicked */
  onToggleCollapse?: () => void;
}

/* ------------------------------------------------------------------ */
/*  NavItem                                                            */
/* ------------------------------------------------------------------ */

function NavItem({ item, collapsed }: { item: SidebarNavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));

  const content = (
    <>
      <item.icon
        className={cn(
          "w-[18px] h-[18px] flex-shrink-0",
          isActive ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600",
        )}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                isActive
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </>
  );

  const classes = cn(
    "flex items-center gap-3 rounded-lg transition-colors",
    collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
    isActive
      ? "bg-brand-50 text-brand-700 font-medium"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 group",
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={classes} title={collapsed ? item.label : undefined}>
      {content}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export function Sidebar({
  sections,
  footer,
  className,
  appName = "PromptLab",
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useLanguage();

  const resolvedSections = sections ?? [
    {
      heading: t("sidebar.menu"),
      items: [
        { label: t("sidebar.projects"), href: "/dashboard", icon: FolderKanban },
        { label: t("sidebar.experiments"), href: "/dashboard/experiments", icon: FlaskConical, badge: "Beta" },
        { label: t("sidebar.analytics"), href: "/dashboard/analytics", icon: BarChart3 },
      ],
    },
    {
      heading: t("sidebar.tools"),
      items: [
        { label: t("sidebar.versions"), href: "/dashboard/versions", icon: GitBranch },
        { label: t("sidebar.settings"), href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];
  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-gray-100 transition-all duration-200",
        collapsed ? "w-[56px]" : "w-60",
        className,
      )}
    >
      {/* ---- Logo ---- */}
      <div
        className={cn(
          "flex-shrink-0 border-b border-gray-100",
          collapsed ? "px-0 py-[18px] flex justify-center" : "px-5 py-[18px]",
        )}
      >
        <Link
          href="/"
          className={cn(
            "flex items-center select-none",
            collapsed ? "gap-0" : "gap-[10px]",
          )}
        >
          <div className="w-[34px] h-[34px] rounded-lg bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/20 flex-shrink-0">
            <Beaker className="w-[19px] h-[19px] text-white" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-gray-900">
              {appName}
            </span>
          )}
        </Link>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto py-5 space-y-6">
        {resolvedSections.map((section, si) => (
          <div key={si} className={cn(collapsed ? "px-1.5" : "px-3")}>
            {/* Section heading */}
            {section.heading && !collapsed && (
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                {section.heading}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ---- Collapse Toggle ---- */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex-shrink-0 flex items-center h-10 border-t border-gray-100",
            "text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors",
            collapsed ? "justify-center w-full" : "justify-end px-4",
          )}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}

      {/* ---- Footer ---- */}
      <div
        className={cn(
          "flex-shrink-0 border-t border-gray-100",
          collapsed ? "px-0 py-4 flex justify-center" : "px-5 py-4",
        )}
      >
        {footer ?? (
          <DefaultFooter collapsed={collapsed} />
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Default footer                                                     */
/* ------------------------------------------------------------------ */

function DefaultFooter({ collapsed }: { collapsed: boolean }) {
  const { t } = useLanguage();

  if (collapsed) {
    return (
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title="User menu"
      >
        <User className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* User info row */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          D
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">Devout Zhu</p>
          <p className="text-xs text-gray-400 truncate">devoutzt@gmail.com</p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          title={t("sidebar.settings")}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{t("sidebar.settings")}</span>
        </Link>
        <span className="flex-1" />
        <Link
          href="/help"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          title={t("sidebar.help")}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{t("sidebar.help")}</span>
        </Link>
      </div>
    </div>
  );
}
