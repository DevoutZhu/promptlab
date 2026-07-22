"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Beaker, FolderKanban, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  NavItem                                                             */
/* ------------------------------------------------------------------ */

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-brand-50 text-brand-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                              */
/* ------------------------------------------------------------------ */

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 h-14 w-full bg-white border-b border-gray-200">
      <div className="px-4 h-full flex items-center justify-between">
        {/* ---- Left: Logo ---- */}
        <Link
          href="/"
          className="flex items-center gap-2 select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/20 flex-shrink-0">
            <Beaker className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </div>
          <span className="hidden sm:inline text-base font-bold tracking-tight text-gray-900">
            PromptLab
          </span>
        </Link>

        {/* ---- Right: Nav links ---- */}
        <div className="flex items-center gap-1">
          <NavItem href="/dashboard" label="项目" icon={FolderKanban} />
          <NavItem href="/settings" label="设置" icon={Settings} />
        </div>
      </div>
    </nav>
  );
}
