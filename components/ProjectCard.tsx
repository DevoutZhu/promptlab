"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Clock, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectCardProps {
  /** Project name */
  name: string;
  /** Short description */
  description: string;
  /** Number of prompts in this project */
  promptCount: number;
  /** ISO date string or human-readable last-updated timestamp */
  updatedAt: string;
  /** URL to navigate to on click (defaults to /dashboard/{slug}) */
  href?: string;
  /** Additional class names */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Deterministic date formatter -- produces the same output on server and client.
 *  Returns a stable date-only string for the initial SSR render. */
function formatDateStable(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Relative-time formatter -- MUST only be called on the client because it uses
 *  Date.now(), which differs between server and browser. */
function timeAgoClient(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string, locale: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return t("projectcard.justNow");
    if (diffMin < 60) return t("projectcard.minAgo", { n: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t("projectcard.hourAgo", { n: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return t("projectcard.dayAgo", { n: diffDay });
    const diffWk = Math.floor(diffDay / 7);
    if (diffWk < 5) return t("projectcard.weekAgo", { n: diffWk });
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ------------------------------------------------------------------ */
/*  TimeAgo -- deferred client-only relative time display              */
/*  SSR initial render shows a stable date; useEffect updates it.      */
/* ------------------------------------------------------------------ */

function TimeAgo({ dateStr }: { dateStr: string }) {
  const { t, language } = useLanguage();
  const [text, setText] = useState(() => formatDateStable(dateStr, language));

  useEffect(() => {
    setText(timeAgoClient(dateStr, t, language));
  }, [dateStr, t, language]);

  return <>{text}</>;
}

/* ------------------------------------------------------------------ */
/*  ProjectCard                                                        */
/* ------------------------------------------------------------------ */

export function ProjectCard({
  name,
  description,
  promptCount,
  updatedAt,
  href,
  className,
}: ProjectCardProps) {
  const { t } = useLanguage();
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const target = href ?? `/dashboard/${slug}`;

  return (
    <Link
      href={target}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-200",
        "hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/[0.06]",
        "active:scale-[0.99]",
        className,
      )}
    >
      {/* ---- Icon ---- */}
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
        <FolderKanban className="w-5 h-5 text-brand-600" strokeWidth={1.8} />
      </div>

      {/* ---- Name ---- */}
      <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:text-brand-700 transition-colors line-clamp-1">
        {name}
      </h3>

      {/* ---- Description ---- */}
      <p className="text-sm text-gray-500 leading-relaxed mb-5 line-clamp-2 flex-1">
        {description}
      </p>

      {/* ---- Meta ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {promptCount} {promptCount === 1 ? t("projectcard.prompt") : t("projectcard.prompts")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <TimeAgo dateStr={updatedAt} />
          </span>
        </div>

        {/* Arrow indicator */}
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
