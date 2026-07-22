"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Beaker,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  Plus,
  Star,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { ScoreChart } from "@/components/ScoreChart";
import { cn } from "@/lib/cn";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types (matching API response)                                      */
/* ------------------------------------------------------------------ */

interface ProjectData {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  prompts: PromptItem[];
}

interface PromptItem {
  id: number;
  projectId: number;
  name: string;
  content: string;
  variables: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
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
/*  Inferred prompt status                                             */
/* ------------------------------------------------------------------ */

function inferPromptStatus(
  prompt: PromptItem,
  experiments: ExperimentItem[],
): "active" | "experiment" | "draft" {
  const hasRunningExp = experiments.some(
    (e) => e.promptId === prompt.id && e.status === "running",
  );
  if (hasRunningExp) return "experiment";
  if (prompt.version >= 2) return "active";
  return "draft";
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_LABEL_KEYS: Record<string, string> = {
  active: "status.active",
  experiment: "status.experiment",
  draft: "status.draft",
  running: "status.running",
  completed: "status.completed",
  baseline: "status.baseline",
  candidate: "status.candidate",
  tie: "status.tie",
};

const statusConfig: Record<string, { className: string }> = {
  active: { className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  experiment: { className: "bg-amber-50 text-amber-700 border-amber-200" },
  draft: { className: "bg-gray-50 text-gray-600 border-gray-200" },
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const cfg = statusConfig[status] ?? statusConfig.draft;
  return (
    <span className={cn("inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border", cfg.className)}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton components                                                */
/* ------------------------------------------------------------------ */

function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      <td className="px-6 py-3.5"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
      <td className="px-6 py-3.5"><div className="h-3.5 w-10 bg-gray-100 rounded" /></td>
      <td className="px-6 py-3.5"><div className="h-3.5 w-16 bg-gray-100 rounded" /></td>
      <td className="px-6 py-3.5"><div className="h-3.5 w-12 bg-gray-100 rounded" /></td>
      <td className="px-6 py-3.5"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
    </tr>
  );
}

function ExperimentRowSkeleton() {
  return (
    <div className="px-5 py-4 space-y-2 animate-pulse">
      <div className="h-4 w-full bg-gray-100 rounded" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const { t } = useLanguage();

  const [project, setProject] = useState<ProjectData | null>(null);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Fetch project data ---- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch project (includes prompts)
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (!projectRes.ok) {
        const body = await projectRes.json().catch(() => null);
        throw new Error(body?.error ?? t("error.loadStatus", { status: projectRes.status }));
      }
      const projectData: ProjectData = await projectRes.json();
      setProject(projectData);
      setPrompts(projectData.prompts ?? []);

      // Fetch experiments for all prompts in parallel
      if (projectData.prompts && projectData.prompts.length > 0) {
        const expResults = await Promise.allSettled(
          projectData.prompts.map((p) =>
            fetch(`/api/experiments?promptId=${p.id}`).then((r) =>
              r.ok ? (r.json() as Promise<ExperimentItem[]>) : ([] as ExperimentItem[]),
            ),
          ),
        );
        const allExperiments: ExperimentItem[] = [];
        for (const result of expResults) {
          if (result.status === "fulfilled") {
            allExperiments.push(...result.value);
          }
        }
        // Parse results JSON strings from the API
        const parsedExperiments = allExperiments.map((exp) => {
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.unexpected"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId, fetchData]);

  /* ---- Derived stats ---- */
  const stats = useMemo(() => {
    const totalPrompts = prompts.length;
    const activeExperiments = experiments.filter((e) => e.status === "running").length;
    const totalVersions = prompts.reduce((sum, p) => sum + p.version, 0);
    return { totalPrompts, activeExperiments, totalVersions };
  }, [prompts, experiments]);

  /* ---- Handlers ---- */
  const handlePromptClick = useCallback(
    (promptId: number) => {
      router.push(`/dashboard/${projectId}/prompts/${promptId}`);
    },
    [projectId, router],
  );

  const projectName = project?.name ?? `Project #${projectId}`;

  /* ---- Score chart data (no historical API — show empty) ---- */
  const scoreData = useMemo(() => {
    return [] as { date: string; score: number }[];
  }, []);

  /* ---- Render ---- */
  return (
    <div className="w-full px-4 pt-6 pb-12">
      {/* ---- TOP BAR: breadcrumb + title | LanguageSwitcher + action button ---- */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">
              {t("project.breadcrumb")}
            </Link>
            <ChevronRight className="w-3 h-3" />
            {loading ? (
              <span className="inline-block w-24 h-3 bg-gray-200 rounded animate-pulse" />
            ) : (
              <span className="text-gray-600 font-medium">{projectName}</span>
            )}
          </nav>
          {loading ? (
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mt-1" />
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-gray-900">{projectName}</h1>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={async () => {
              const res = await fetch("/api/prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: Number(projectId), name: `prompt-${Date.now()}`, content: "New prompt" }),
              });
              if (res.ok) {
                const data = await res.json();
                router.push(`/dashboard/${projectId}/prompts/${data.id}`);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            {t("project.newPrompt")}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* ---- ERROR STATE ---- */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("project.loadError")}</h2>
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

        {/* ---- CONTENT ---- */}
        {!error && (
          <>
            {/* ---- STATS ---- */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200" />
                      <div className="w-12 h-5 rounded-md bg-gray-100" />
                    </div>
                    <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label={t("project.stats.totalPrompts")}
                  value={stats.totalPrompts}
                  icon={FileText}
                />
                <StatCard
                  label={t("stats.activeExperiments")}
                  value={stats.activeExperiments}
                  icon={Beaker}
                />
                <StatCard
                  label={t("stats.avgScore")}
                  value="--"
                  icon={Star}
                />
                <StatCard
                  label={t("project.stats.versions")}
                  value={stats.totalVersions}
                  icon={Layers}
                />
              </div>
            )}

            {/* ---- MAIN CONTENT: Table + Sidebar ---- */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Prompts Table */}
              <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{t("project.table.prompts")}</h2>
                  <span className="text-xs text-gray-400">{t("project.table.total", { count: prompts.length })}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          {t("project.table.name")}
                        </th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-[80px]">
                          {t("project.table.version")}
                        </th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-[100px]">
                          {t("project.table.updated")}
                        </th>
                        <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-[100px]">
                          {t("project.table.status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)
                      ) : prompts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <p className="text-sm text-gray-400">{t("project.table.empty")}</p>
                            <button
                              onClick={async () => {
                                const res = await fetch("/api/prompts", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ projectId: Number(projectId), name: `prompt-${Date.now()}`, content: "New prompt" }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  router.push(`/dashboard/${projectId}/prompts/${data.id}`);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 mt-2 text-sm text-brand-500 hover:text-brand-700 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {t("project.table.createFirst")}
                            </button>
                          </td>
                        </tr>
                      ) : (
                        prompts.map((prompt) => {
                          const status = inferPromptStatus(prompt, experiments);
                          const statusLabel = t(STATUS_LABEL_KEYS[status] ?? "status.draft");
                          return (
                            <tr
                              key={prompt.id}
                              onClick={() => handlePromptClick(prompt.id)}
                              className="border-b border-gray-50 hover:bg-brand-50/50 cursor-pointer transition-colors group"
                              tabIndex={0}
                              role="row"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") handlePromptClick(prompt.id);
                              }}
                            >
                              <td className="px-6 py-3.5">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-brand-700 transition-colors">
                                  {prompt.name}
                                </span>
                              </td>
                              <td className="px-6 py-3.5">
                                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
                                  v{prompt.version}
                                </code>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="text-xs text-gray-500">
                                  {prompt.updatedAt.slice(0, 10)}
                                </span>
                              </td>
                              <td className="px-6 py-3.5">
                                <StatusBadge status={status} label={statusLabel} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar: Experiments + Actions */}
              <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
                {/* Active Experiments */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">{t("project.experiments")}</h2>
                    <span className="text-[11px] text-gray-400">{experiments.length}</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
                    {loading ? (
                      <>
                        <ExperimentRowSkeleton />
                        <ExperimentRowSkeleton />
                        <ExperimentRowSkeleton />
                      </>
                    ) : experiments.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-xs text-gray-400">{t("project.experiments.empty")}</p>
                      </div>
                    ) : (
                      experiments.map((exp) => {
                        const isRunning = exp.status === "running";
                        const isCompleted = exp.status === "completed";
                        const winner =
                          isCompleted && exp.results
                            ? exp.results.winner === "baseline"
                              ? t("experiment.baselineWins")
                              : exp.results.winner === "candidate"
                                ? t("experiment.candidateWins")
                                : t("status.tie")
                            : null;
                        const improvement =
                          isCompleted &&
                          exp.results &&
                          exp.results.winner !== "tie"
                            ? (() => {
                                const bs = exp.results!.baselineScore;
                                const cs = exp.results!.candidateScore;
                                const diff = Math.abs(cs - bs).toFixed(1);
                                return t("experiment.scoreDiff", { diff });
                              })()
                            : null;

                        const expStatusLabel = t(STATUS_LABEL_KEYS[exp.status] ?? exp.status);

                        return (
                          <div key={exp.id} className="px-5 py-4 space-y-2">
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {exp.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isRunning
                                    ? "bg-amber-400 animate-pulse"
                                    : isCompleted
                                      ? "bg-emerald-400"
                                      : "bg-gray-300",
                                )}
                              />
                              <span className="text-[11px] text-gray-500">
                                {expStatusLabel}
                              </span>
                              {winner && (
                                <>
                                  <span className="text-[11px] text-gray-300">|</span>
                                  <span className="text-[11px] font-medium text-emerald-600">
                                    {winner} {improvement}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t("project.quickActions")}
                  </h3>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-gray-700 hover:text-brand-600 transition-colors flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-gray-400" />
                    {t("project.actions.batchEval")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-gray-700 hover:text-brand-600 transition-colors flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    {t("project.actions.export")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-gray-700 hover:text-brand-600 transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    {t("project.actions.changeLog")}
                  </button>
                </div>
              </div>
            </div>

            {/* ---- SCORE TREND CHART ---- */}
            <ScoreChart
              data={scoreData}
              title={t("scorechart.title")}
              yMin={0}
              yMax={100}
              showAverage={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
