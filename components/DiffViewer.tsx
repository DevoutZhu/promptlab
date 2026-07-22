"use client";

import React, { useMemo } from "react";
import { diffWords } from "diff";
import { cn } from "@/lib/cn";
import { Minus, Plus, ArrowRightLeft } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DiffViewerProps {
  /** Original (old) text */
  oldText: string;
  /** Modified (new) text */
  newText: string;
  /** Optional title for the old panel */
  oldLabel?: string;
  /** Optional title for the new panel */
  newLabel?: string;
  /** Additional class names */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  DiffChange                                                         */
/* ------------------------------------------------------------------ */

type DiffPart =
  | { type: "added"; value: string }
  | { type: "removed"; value: string }
  | { type: "unchanged"; value: string };

function computeDiff(oldText: string, newText: string): {
  oldParts: DiffPart[];
  newParts: DiffPart[];
  additions: number;
  deletions: number;
} {
  const changes = diffWords(oldText, newText);
  const oldParts: DiffPart[] = [];
  const newParts: DiffPart[] = [];
  let additions = 0;
  let deletions = 0;

  for (const change of changes) {
    if (change.added) {
      newParts.push({ type: "added", value: change.value });
      additions += change.count ?? change.value.length;
    } else if (change.removed) {
      oldParts.push({ type: "removed", value: change.value });
      deletions += change.count ?? change.value.length;
    } else {
      oldParts.push({ type: "unchanged", value: change.value });
      newParts.push({ type: "unchanged", value: change.value });
    }
  }

  return { oldParts, newParts, additions, deletions };
}

/* ------------------------------------------------------------------ */
/*  Render helpers                                                     */
/* ------------------------------------------------------------------ */

function DiffLine({ parts, mode }: { parts: DiffPart[]; mode: "old" | "new" }) {
  const onlyRemoved = parts.every((p) => p.type === "removed" || p.type === "unchanged");
  const onlyAdded = parts.every((p) => p.type === "added" || p.type === "unchanged");
  const isEmpty =
    parts.length === 0 ||
    (mode === "old" && onlyAdded) ||
    (mode === "new" && onlyRemoved);

  return (
    <div
      className={cn(
        "px-4 py-2 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[2.25rem]",
        mode === "old" && "bg-red-50/40",
        mode === "new" && "bg-green-50/40",
        isEmpty && "opacity-0 select-none pointer-events-none",
      )}
    >
      {parts.map((part, i) => {
        switch (part.type) {
          case "added":
            return mode === "new" ? (
              <span
                key={i}
                className="bg-green-200 text-green-900 rounded-sm px-0.5"
              >
                {part.value}
              </span>
            ) : null;
          case "removed":
            return mode === "old" ? (
              <span
                key={i}
                className="bg-red-200 text-red-900 rounded-sm px-0.5 line-through decoration-red-400"
              >
                {part.value}
              </span>
            ) : null;
          default:
            return (
              <span key={i} className="text-gray-600">
                {part.value}
              </span>
            );
        }
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DiffViewer                                                         */
/* ------------------------------------------------------------------ */

export function DiffViewer({
  oldText,
  newText,
  oldLabel = "Old Version",
  newLabel = "New Version",
  className,
}: DiffViewerProps) {
  const { oldParts, newParts, additions, deletions } = useMemo(
    () => computeDiff(oldText, newText),
    [oldText, newText],
  );

  const hasChanges = additions > 0 || deletions > 0;

  return (
    <div className={cn("flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden", className)}>
      {/* ---- Stats bar ---- */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ArrowRightLeft className="w-[14px] h-[14px]" />
          <span className="font-medium">Changes</span>
        </div>

        {hasChanges ? (
          <>
            <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 rounded-md px-2 py-0.5">
              <Plus className="w-3 h-3" />
              {additions.toLocaleString()} additions
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 rounded-md px-2 py-0.5">
              <Minus className="w-3 h-3" />
              {deletions.toLocaleString()} deletions
            </div>
          </>
        ) : (
          <span className="text-xs text-gray-400">No changes detected</span>
        )}
      </div>

      {/* ---- Side-by-side diff ---- */}
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {/* Old panel */}
        <div className="flex flex-col min-w-0">
          <div className="px-4 py-2 border-b border-gray-100 bg-red-50/30">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-[0.08em]">
              {oldLabel}
            </span>
          </div>
          <div className="overflow-auto max-h-[480px]">
            <DiffLine parts={oldParts} mode="old" />
          </div>
        </div>

        {/* New panel */}
        <div className="flex flex-col min-w-0">
          <div className="px-4 py-2 border-b border-gray-100 bg-green-50/30">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-[0.08em]">
              {newLabel}
            </span>
          </div>
          <div className="overflow-auto max-h-[480px]">
            <DiffLine parts={newParts} mode="new" />
          </div>
        </div>
      </div>
    </div>
  );
}
