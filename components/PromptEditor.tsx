"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { Braces, Info } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PromptEditorProps {
  /** The current prompt text value */
  value: string;
  /** Called whenever the text changes */
  onChange: (value: string) => void;
  /** List of available template variable names (without {{ }}) */
  variables: string[];
  /** Placeholder text shown when the editor is empty */
  placeholder?: string;
  /** Maximum character count (displays counter but does not enforce) */
  maxLength?: number;
  /** Additional class names */
  className?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Highlighted text renderer                                          */
/* ------------------------------------------------------------------ */

/** Renders text with {{variable}} spans highlighted in blue. */
function HighlightedText({
  text,
  variables,
}: {
  text: string;
  variables: string[];
}) {
  // Regex to match {{varname}} — captures the inner name
  const pattern = useMemo(() => {
    if (variables.length === 0) return /(?!) /; // never matches
    const escaped = variables.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`\\{\\{\\s*(${escaped.join("|")})\\s*\\}\\}`, "gi");
  }, [variables]);

  const parts = useMemo(() => {
    const result: { text: string; isVariable: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Reset lastIndex manually for the global regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      // Push text before this match
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), isVariable: false });
      }
      result.push({ text: match[0], isVariable: true });
      lastIndex = pattern.lastIndex;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), isVariable: false });
    }

    return result;
  }, [text, pattern]);

  return (
    <>
      {parts.map((part, i) =>
        part.isVariable ? (
          <span
            key={i}
            className="inline-flex items-center rounded bg-blue-100 px-1 py-0.5 text-blue-700 font-mono text-[13px] leading-snug"
          >
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PromptEditor                                                       */
/* ------------------------------------------------------------------ */

export function PromptEditor({
  value,
  onChange,
  variables,
  placeholder = "Write your prompt here...",
  maxLength,
  className,
  disabled = false,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---- Insert variable at cursor position ---- */
  const insertVariable = useCallback(
    (varName: string) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const token = `{{${varName}}}`;
      const newValue = value.slice(0, start) + token + value.slice(end);
      onChange(newValue);

      // Restore cursor after the inserted token (deferred to next tick)
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + token.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
  );

  /* ---- Character count ---- */
  const charCount = value.length;
  const isOverLimit = maxLength != null && charCount > maxLength;

  return (
    <div className={cn("flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden", className)}>
      {/* ---- Toolbar ---- */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Braces className="w-[14px] h-[14px]" />
          <span>Prompt Editor</span>
        </div>

        {/* Char counter */}
        <div
          className={cn(
            "text-xs tabular-nums",
            isOverLimit ? "text-red-500 font-medium" : "text-gray-400",
          )}
        >
          {charCount.toLocaleString()}
          {maxLength != null && (
            <>
              {" "}
              / {maxLength.toLocaleString()}
            </>
          )}
        </div>
      </div>

      {/* ---- Editor area (split: textarea + highlight overlay) ---- */}
      <div className="relative flex-1 min-h-0">
        {/* Highlighted preview layer (read-only, sits behind the textarea visually) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-transparent pointer-events-none select-none overflow-hidden"
        >
          {value ? (
            <HighlightedText text={value} variables={variables} />
          ) : (
            <span className="text-transparent">{placeholder}</span>
          )}
        </div>

        {/* Actual textarea (transparent text so highlights show through) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={12}
          className={cn(
            "relative w-full resize-y px-4 py-3 font-mono text-sm leading-relaxed",
            "bg-transparent text-transparent caret-gray-900",
            "placeholder:text-gray-300",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          style={{ WebkitTextFillColor: "transparent" }}
          spellCheck={false}
        />
      </div>

      {/* ---- Variable bar ---- */}
      <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2.5">
        {variables.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Info className="w-[13px] h-[13px]" />
            <span>No template variables defined. Add variables to enable quick insertion.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mr-1">
              Variables
            </span>
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => insertVariable(v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white",
                  "px-2.5 py-1 text-xs font-mono text-gray-600",
                  "transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
                  "active:scale-[0.97]",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
                title={`Insert {{${v}}}`}
              >
                <Braces className="w-3 h-3 text-blue-400" />
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
