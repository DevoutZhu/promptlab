"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  GitBranch,
  GitCompare,
  History,
  Loader2,
  RefreshCw,
  Star,
  TrendingUp,
  Variable,
  XCircle,
} from "lucide-react";
import { PromptEditor } from "@/components/PromptEditor";
import { DiffViewer } from "@/components/DiffViewer";
import { cn } from "@/lib/cn";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types (matching API response)                                      */
/* ------------------------------------------------------------------ */

interface PromptVersion {
  id: number;
  projectId: number;
  name: string;
  content: string;
  variables: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface PromptData extends PromptVersion {
  versions: PromptVersion[];
}

interface ExperimentItem {
  id: number;
  promptId: number;
  name: string;
  baselineVersion: number;
  candidateVersion: number;
  status: "draft" | "running" | "completed";
  results: {
    baselineScore: number;
    candidateScore: number;
    winner: "baseline" | "candidate" | "tie";
    comparisons: { metric: string; baseline: number; candidate: number; difference: number }[];
  } | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractVariableNames(text: string): string[] {
  const names = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names);
}

function formatDate(isoStr: string, locale: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

/* ------------------------------------------------------------------ */
/*  Inferred variable definition (API only stores names)                */
/* ------------------------------------------------------------------ */

interface VariableDef {
  name: string;
  type: string;
  defaultValue: string;
}

function buildVariableDefs(variableNames: string[]): VariableDef[] {
  return variableNames.map((name) => ({
    name,
    type: "string",
    defaultValue: "—",
  }));
}

/* ------------------------------------------------------------------ */
/*  Variable type badge                                                */
/* ------------------------------------------------------------------ */

const typeColors: Record<string, string> = {
  string: "bg-blue-50 text-blue-700 border-blue-200",
  number: "bg-purple-50 text-purple-700 border-purple-200",
  enum: "bg-amber-50 text-amber-700 border-amber-200",
  text: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function VarTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border",
        typeColors[type] ?? "bg-gray-50 text-gray-600 border-gray-200",
      )}
    >
      {type}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton components                                                */
/* ------------------------------------------------------------------ */

function EditorSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-14 bg-gray-100 rounded-md" />
          <div className="h-6 w-10 bg-gray-100 rounded-md" />
          <div className="h-6 w-10 bg-gray-100 rounded-md" />
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-2/3 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-4 w-28 bg-gray-200 rounded" />
      </div>
      <div className="p-5 space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 pl-8">
            <div className="w-[23px] h-[23px] rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-3 w-40 bg-gray-100 rounded" />
              <div className="h-3 w-full bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 animate-pulse">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 space-y-1.5">
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="p-5 space-y-4">
          <div className="h-10 w-16 bg-gray-200 rounded mx-auto" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-2 w-full bg-gray-100 rounded" />
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-2 w-full bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status label keys (shared mapping)                                  */
/* ------------------------------------------------------------------ */

const STATUS_LABEL_KEYS: Record<string, string> = {
  running: "status.running",
  completed: "status.completed",
  draft: "status.draft",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PromptDetailPage() {
  const params = useParams<{ projectId: string; promptId: string }>();
  const { projectId, promptId } = params;
  const { t, language } = useLanguage();
  const dateLocale = language === "zh" ? "zh-CN" : "en-US";

  /* ---- Data state ---- */
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- UI state ---- */
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diffMode, setDiffMode] = useState(false);
  const [diffLeftId, setDiffLeftId] = useState<number | null>(null);
  const [diffRightId, setDiffRightId] = useState<number | null>(null);
  const router = useRouter();

  /* ---- Fetch data ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [promptRes, expRes] = await Promise.all([
        fetch(`/api/prompts/${promptId}`),
        fetch(`/api/experiments?promptId=${promptId}`),
      ]);

      if (!promptRes.ok) {
        const body = await promptRes.json().catch(() => null);
        throw new Error(body?.error ?? t("error.loadStatus", { status: promptRes.status }));
      }

      const promptJson: PromptData = await promptRes.json();
      setPromptData(promptJson);

      // Default to the latest version (versions are ordered newest first)
      if (promptJson.versions && promptJson.versions.length > 0) {
        const latestId = promptJson.versions[0].id;
        setSelectedVersionId((prev) => prev ?? latestId);
      }

      if (expRes.ok) {
        const expJson: ExperimentItem[] = await expRes.json();
        // Parse results JSON strings from the API
        const parsedExperiments = expJson.map((exp) => {
          if (typeof exp.results === "string") {
            try {
              return { ...exp, results: JSON.parse(exp.results) };
            } catch {
              return { ...exp, results: null };
            }
          }
          return exp;
        });
        setExperiments(parsedExperiments);
      } else {
        setExperiments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.unexpected"));
    } finally {
      setLoading(false);
    }
  }, [promptId, t]);

  useEffect(() => {
    if (promptId) fetchData();
  }, [promptId, fetchData]);

  /* ---- Derived: versions list ---- */
  const versions = useMemo(
    () => promptData?.versions ?? [],
    [promptData],
  );

  /* ---- Selected version (derived) ---- */
  const selectedVersion = useMemo(() => {
    if (!versions.length) return null;
    if (selectedVersionId) {
      return versions.find((v) => v.id === selectedVersionId) ?? versions[0];
    }
    return versions[0];
  }, [versions, selectedVersionId]);

  /* ---- Diff left/right ---- */
  const diffLeft = useMemo(
    () => versions.find((v) => v.id === diffLeftId) ?? versions[0] ?? null,
    [versions, diffLeftId],
  );

  const diffRight = useMemo(
    () => versions.find((v) => v.id === diffRightId) ?? versions[0] ?? null,
    [versions, diffRightId],
  );

  /* ---- Variables for the selected version ---- */
  const activeVariableNames = useMemo(() => {
    if (!selectedVersion) return [];
    return extractVariableNames(selectedVersion.content);
  }, [selectedVersion]);

  const activeVariables = useMemo(
    () => buildVariableDefs(activeVariableNames),
    [activeVariableNames],
  );

  /* ---- Evaluation data (no dedicated API -- derived from experiments) ---- */
  const evalData = useMemo(() => {
    const completedExps = experiments.filter((e) => e.status === "completed" && e.results);
    if (completedExps.length === 0) return null;

    // Aggregate: average of completed experiment scores
    const scores = completedExps
      .map((e) => e.results!)
      .filter((r) => r !== null)
      .flatMap((r) => [r.baselineScore, r.candidateScore]);

    if (scores.length === 0) return null;

    const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const passedCount = scores.filter((s) => s >= 80).length;
    const failedCount = scores.filter((s) => s < 80).length;

    return {
      score: avgScore,
      passed: passedCount,
      failed: failedCount,
      total: scores.length,
      lastRun: completedExps[0]?.createdAt ?? null,
    };
  }, [experiments]);

  /* ---- Handlers ---- */
  const handleVersionSelect = useCallback((versionId: number) => {
    setSelectedVersionId(versionId);
    setVersionDropdownOpen(false);
    setIsEditing(false);
    setDiffMode(false);
  }, []);

  const handleStartEditing = useCallback(() => {
    if (selectedVersion) {
      setEditValue(selectedVersion.content);
      setIsEditing(true);
      setDiffMode(false);
    }
  }, [selectedVersion]);

  const handleSaveEdit = useCallback(async () => {
    if (!editValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prompts/${promptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t("prompt.saveFailed"));
      }
      // Refresh data and select the newest version
      const [promptRes] = await Promise.all([
        fetch(`/api/prompts/${promptId}`),
      ]);
      if (promptRes.ok) {
        const updated: PromptData = await promptRes.json();
        setPromptData(updated);
        if (updated.versions.length > 0) {
          setSelectedVersionId(updated.versions[0].id);
        }
      }
      setIsEditing(false);
      setEditValue("");
    } catch (err) {
      alert(err instanceof Error ? err.message : t("prompt.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [editValue, promptId, t]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selectedVersion) return;
    await navigator.clipboard.writeText(selectedVersion.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedVersion]);

  const handleToggleDiff = useCallback(() => {
    if (diffMode) {
      setDiffMode(false);
    } else {
      const currentIdx = versions.findIndex((v) => v.id === selectedVersionId);
      const prevIdx = Math.min(currentIdx + 1, versions.length - 1);
      if (versions[currentIdx] && versions[prevIdx]) {
        setDiffLeftId(versions[prevIdx].id);
        setDiffRightId(versions[currentIdx].id);
      }
      setDiffMode(true);
    }
  }, [diffMode, selectedVersionId, versions]);

  const currentVersionIndex = versions.findIndex((v) => v.id === selectedVersionId);
  const promptName = promptData?.name ?? `Prompt #${promptId}`;

  /* ---- Render ---- */
  return (
    <div className="w-full px-4 pt-6 pb-12">
      {/* ---- TOP BAR: back + breadcrumb + title + version | LanguageSwitcher + action button ---- */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/${projectId}`}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("prompt.back")}
          </Link>
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Link href="/dashboard" className="hover:text-gray-600 transition-colors">
                {t("prompt.breadcrumb")}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <Link
                href={`/dashboard/${projectId}`}
                className="hover:text-gray-600 transition-colors"
              >
                {projectId}
              </Link>
              <ChevronRight className="w-3 h-3" />
              {loading ? (
                <span className="inline-block w-28 h-3 bg-gray-200 rounded animate-pulse" />
              ) : (
                <span className="text-gray-600 font-medium">{promptName}</span>
              )}
            </nav>
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
              ) : (
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                  {promptName}
                </h1>
              )}

              {/* Version dropdown */}
              {!loading && selectedVersion && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    <GitBranch className="w-3 h-3 text-gray-400" />
                    v{selectedVersion.version}
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 text-gray-400 transition-transform",
                        versionDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {versionDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setVersionDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-100 rounded-lg shadow-lg z-20 py-1">
                        {versions.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleVersionSelect(v.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm transition-colors",
                              v.id === selectedVersionId
                                ? "bg-brand-50 text-brand-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>v{v.version}</span>
                              <span className="text-[11px] text-gray-400">
                                {v.createdAt.slice(0, 10)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <LanguageSwitcher />
          <button
            onClick={async () => {
              const versions = promptData?.versions ?? [];
              const latest = versions[0];
              const oldest = versions[versions.length - 1];
              if (oldest && latest && oldest.version !== latest.version) {
                const res = await fetch("/api/experiments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ promptId: Number(promptId), name: `实验-${Date.now()}`, baselineVersion: oldest.version, candidateVersion: latest.version }),
                });
                if (res.ok) {
                  const exp = await res.json();
                  // Auto-run experiment (fire-and-forget, don't block navigation)
                  fetch("/api/experiments", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: exp.id, status: "running", iterations: 1 }),
                  });
                  router.push(`/dashboard/${projectId}`);
                }
              } else {
                alert(t("prompt.actions.needMoreVersions") || "需要至少2个版本才能创建实验");
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
          >
            <Beaker className="w-4 h-4" />
            {t("prompt.newExperiment")}
          </button>
        </div>
      </div>

      {/* ---- MAIN CONTENT ---- */}
        {/* ---- ERROR STATE ---- */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("prompt.loadError")}</h2>
            <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              {t("dashboard.retry")}
            </button>
          </div>
        )}

        {/* ---- LOADED CONTENT ---- */}
        {!error && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Editor + Diff + Timeline */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Prompt Editor Card */}
              {loading ? (
                <EditorSkeleton />
              ) : selectedVersion ? (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">
                      {diffMode ? t("prompt.versionComparison") : t("prompt.template")}
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* Diff toggle */}
                      <button
                        type="button"
                        onClick={handleToggleDiff}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                          diffMode
                            ? "bg-brand-50 text-brand-700"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        <GitCompare className="w-3 h-3" />
                        {diffMode ? t("prompt.exitDiff") : t("prompt.compare")}
                      </button>

                      {!diffMode && (
                        <>
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            {copied ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {t("prompt.copied")}
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                {t("prompt.copy")}
                              </>
                            )}
                          </button>
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={handleStartEditing}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-brand-500 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                            >
                              {t("prompt.edit")}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Diff mode */}
                  {diffMode && diffLeft && diffRight && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{t("prompt.diffLeft")}</span>
                          <select
                            value={diffLeftId ?? ""}
                            onChange={(e) => setDiffLeftId(Number(e.target.value))}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                          >
                            {versions.map((v) => (
                              <option key={v.id} value={v.id}>
                                v{v.version} ({v.id})
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-xs text-gray-400">{t("prompt.diffVs")}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{t("prompt.diffRight")}</span>
                          <select
                            value={diffRightId ?? ""}
                            onChange={(e) => setDiffRightId(Number(e.target.value))}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                          >
                            {versions.map((v) => (
                              <option key={v.id} value={v.id}>
                                v{v.version} ({v.id})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <DiffViewer
                        oldText={diffLeft.content}
                        newText={diffRight.content}
                        oldLabel={`v${diffLeft.version}`}
                        newLabel={`v${diffRight.version}`}
                      />
                    </div>
                  )}

                  {/* Edit mode */}
                  {!diffMode && isEditing && (
                    <div className="p-5 space-y-4">
                      <PromptEditor
                        value={editValue}
                        onChange={setEditValue}
                        variables={activeVariableNames}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={saving || !editValue.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand-500 text-white text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                          {saving ? t("prompt.saving") : t("prompt.saveChanges")}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="px-4 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          {t("prompt.cancel")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Read-only mode */}
                  {!diffMode && !isEditing && (
                    <div className="p-5">
                      <PromptEditor
                        value={selectedVersion.content}
                        onChange={() => undefined}
                        variables={activeVariableNames}
                        disabled
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Version History Timeline */}
              {loading ? (
                <TimelineSkeleton />
              ) : versions.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900">{t("prompt.versionHistory")}</h2>
                    <span className="text-[11px] text-gray-400 ml-auto">
                      {t("prompt.versionsCount", { count: versions.length })}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />

                      <div className="space-y-5">
                        {versions.map((v, idx) => {
                          const isCurrent = v.id === selectedVersionId;
                          const isLatest = idx === 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleVersionSelect(v.id)}
                              className="relative flex items-start gap-4 w-full text-left pl-8 transition-colors group"
                            >
                              {/* Dot */}
                              <div
                                className={cn(
                                  "absolute left-0 w-[23px] h-[23px] rounded-full flex items-center justify-center border-2 transition-colors",
                                  isCurrent
                                    ? "bg-brand-500 border-brand-500"
                                    : "bg-white border-gray-300 group-hover:border-brand-400",
                                )}
                              >
                                {isCurrent && (
                                  <div className="w-[9px] h-[9px] rounded-full bg-white" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      "text-sm font-semibold",
                                      isCurrent ? "text-brand-700" : "text-gray-900",
                                    )}
                                  >
                                    v{v.version}
                                  </span>
                                  {isLatest && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                      {t("prompt.versionCurrent")}
                                    </span>
                                  )}
                                  {isCurrent && !isLatest && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                                      {t("prompt.versionViewing")}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-400 ml-auto">
                                    {t("prompt.versionId")} {v.id}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {formatDate(v.createdAt, dateLocale)}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                  {t("prompt.versionDesc", { version: v.version })}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right: Variables + Eval + Actions */}
            {loading ? (
              <SidebarSkeleton />
            ) : (
              <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
                {/* Variables Panel */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Variable className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900">{t("prompt.variables")}</h2>
                    <span className="text-[11px] text-gray-400 ml-auto">
                      {activeVariables.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {activeVariables.map((v) => (
                      <div key={v.name} className="px-5 py-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono font-semibold text-gray-900">{`{{${v.name}}}`}</code>
                          <VarTypeBadge type={v.type} />
                        </div>
                        <p className="text-[11px] text-gray-500 truncate font-mono">
                          default: {v.defaultValue}
                        </p>
                      </div>
                    ))}
                    {activeVariables.length === 0 && (
                      <div className="px-5 py-8 text-center">
                        <p className="text-xs text-gray-400">{t("prompt.variables.empty")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation Score Panel */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-gray-900">{t("prompt.evaluation")}</h2>
                  </div>
                  <div className="p-5">
                    {evalData ? (
                      <div className="space-y-4">
                        {/* Big score */}
                        <div className="text-center">
                          <span className="text-[42px] font-bold tracking-tight text-gray-900 leading-none">
                            {evalData.score}
                          </span>
                          <span className="text-lg text-gray-400">/100</span>
                        </div>

                        {/* Pass/Fail bars */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-gray-600">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {t("prompt.eval.passed")}
                            </span>
                            <span className="font-semibold text-gray-900">{evalData.passed}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{
                                width: `${evalData.total > 0 ? (evalData.passed / evalData.total) * 100 : 0}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-gray-600">
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                              {t("prompt.eval.failed")}
                            </span>
                            <span className="font-semibold text-gray-900">{evalData.failed}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full transition-all"
                              style={{
                                width: `${evalData.total > 0 ? (evalData.failed / evalData.total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-50">
                          <span>{t("prompt.eval.totalCases", { count: evalData.total })}</span>
                          {evalData.lastRun && (
                            <span>{t("prompt.eval.lastRun", { date: evalData.lastRun.slice(0, 10) })}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-xs text-gray-400">{t("prompt.eval.empty")}</p>
                        <p className="text-[11px] text-gray-300 mt-1">
                          {t("prompt.eval.emptyHint")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("prompt.actions")}
                  </h3>
                  <button
                    type="button"
                    onClick={async () => {
                      const versions = promptData?.versions ?? [];
                      const latest = versions[0];
                      const oldest = versions[versions.length - 1];
                      if (oldest && latest && oldest.version !== latest.version) {
                        const res = await fetch("/api/experiments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ promptId: Number(promptId), name: `实验-${Date.now()}`, baselineVersion: oldest.version, candidateVersion: latest.version }),
                        });
                        if (res.ok) {
                          const exp = await res.json();
                          fetch("/api/experiments", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: exp.id, status: "running", iterations: 1 }),
                          });
                          fetchData();
                        }
                      }
                    }}
                    className="w-full text-left text-sm text-gray-700 hover:text-brand-600 transition-colors flex items-center gap-2"
                  >
                    <Beaker className="w-4 h-4 text-gray-400" />
                    {t("prompt.actions.runExperiment")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-gray-700 hover:text-brand-600 transition-colors flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    {t("prompt.actions.rerunEval")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-gray-700 hover:text-brand-600 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                    {t("prompt.actions.duplicate")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
