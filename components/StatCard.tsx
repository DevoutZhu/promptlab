"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StatCardProps {
  /** Label displayed below the value */
  label: string;
  /** Numeric or string value displayed prominently */
  value: string | number;
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Optional trend indicator, e.g. "+12.5%", "-3.2%" */
  trend?: string;
  /** Additional class names */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseTrend(trend: string): { direction: "up" | "down" | "neutral"; label: string } {
  const trimmed = trend.trim();
  if (trimmed.startsWith("+")) return { direction: "up", label: trimmed };
  if (trimmed.startsWith("-")) return { direction: "down", label: trimmed };
  return { direction: "neutral", label: trimmed };
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  const trendInfo = trend ? parseTrend(trend) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-200",
        "hover:border-brand-200 hover:shadow-md",
        className,
      )}
    >
      {/* ---- Icon + Trend ---- */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-600" strokeWidth={1.8} />
        </div>

        {trendInfo && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-medium",
              trendInfo.direction === "up" && "bg-green-50 text-green-700",
              trendInfo.direction === "down" && "bg-red-50 text-red-700",
              trendInfo.direction === "neutral" && "bg-gray-100 text-gray-600",
            )}
          >
            {trendInfo.direction === "up" && <TrendingUp className="w-3 h-3" />}
            {trendInfo.direction === "down" && <TrendingDown className="w-3 h-3" />}
            {trendInfo.label}
          </span>
        )}
      </div>

      {/* ---- Value ---- */}
      <div className="text-[28px] leading-tight font-bold text-gray-900 tabular-nums tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>

      {/* ---- Label ---- */}
      <p className="mt-1 text-sm text-gray-400">{label}</p>
    </div>
  );
}
