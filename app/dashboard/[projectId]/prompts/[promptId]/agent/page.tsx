"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Target,
  RotateCw,
  Sparkles,
  Trophy,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentRound {
  round: number;
  strategy: string;
  version: number;
  score: number;
  improvement: number;
  thought: string;
  newContent?: string;
}

interface AgentSession {
  taskId: string;
  status: "idle" | "running" | "completed" | "error";
  promptId: number;
  baselineVersion: number;
  baselineScore: number;
  targetScore: number;
  maxIterations: number;
  rounds: AgentRound[];
  winnerVersion: number | null;
  winnerScore: number | null;
  totalImprovement: number | null;
  errorMessage: string | null;
  createdAt: string | null;
}

interface AgentConfig {
  targetScore: number;
  maxIterations: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 2000;
const DEFAULT_TARGET_SCORE = 90;
const DEFAULT_MAX_ITERATIONS = 10;
const MIN_TARGET_SCORE = 10;
const MAX_TARGET_SCORE = 100;
const MIN_ITERATIONS = 1;
const MAX_ITERATIONS = 20;

/* ------------------------------------------------------------------ */
/*  Config Form                                                        */
/* ------------------------------------------------------------------ */

function ConfigForm({
  config,
  onChange,
  onSubmit,
  running,
  baselineExists,
  t,
}: {
  config: AgentConfig;
  onChange: (next: AgentConfig) => void;
  onSubmit: () => void;
  running: boolean;
  baselineExists: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const valid =
    config.targetScore >= MIN_TARGET_SCORE &&
    config.targetScore <= MAX_TARGET_SCORE &&
    config.maxIterations >= MIN_ITERATIONS &&
    config.maxIterations <= MAX_ITERATIONS &&
    baselineExists;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Bot className="w-4 h-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-gray-900">
          {t("agent.configTitle")}
        </h2>
      </div>

      <div className="p-5 space-y-4">
        {!baselineExists && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t("agent.noBaseline")}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target Score */}
          <div>
            <label
              htmlFor="agent-target-score"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5"
            >
              <Target className="w-3.5 h-3.5 text-brand-400" />
              {t("agent.targetScore")}
            </label>
            <div className="relative">
              <input
                id="agent-target-score"
                type="number"
                min={MIN_TARGET_SCORE}
                max={MAX_TARGET_SCORE}
                value={config.targetScore}
                onChange={(e) =>
                  onChange({
                    ...config,
                    targetScore: Math.min(
                      MAX_TARGET_SCORE,
                      Math.max(MIN_TARGET_SCORE, Number(e.target.value) || MIN_TARGET_SCORE),
                    ),
                  })
                }
                disabled={running}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                /{MAX_TARGET_SCORE}
              </span>
            </div>
          </div>

          {/* Max Iterations */}
          <div>
            <label
              htmlFor="agent-max-iterations"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5"
            >
              <RotateCw className="w-3.5 h-3.5 text-brand-400" />
              {t("agent.maxIterations")}
            </label>
            <div className="relative">
              <input
                id="agent-max-iterations"
                type="number"
                min={MIN_ITERATIONS}
                max={MAX_ITERATIONS}
                value={config.maxIterations}
                onChange={(e) =>
                  onChange({
                    ...config,
                    maxIterations: Math.min(
                      MAX_ITERATIONS,
                      Math.max(MIN_ITERATIONS, Number(e.target.value) || MIN_ITERATIONS),
                    ),
                  })
                }
                disabled={running}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                /{MAX_ITERATIONS}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={running || !valid}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("agent.optimizing")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t("agent.startOptimize")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Round Card                                                         */
/* ------------------------------------------------------------------ */

function RoundCard({
  item,
  isLatest,
  isWinner,
  t,
}: {
  item: AgentRound;
  isLatest: boolean;
  isWinner: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div
      className={cn(
        "relative pl-10 border-l-2 transition-colors",
        isWinner
          ? "border-emerald-400"
          : isLatest
            ? "border-brand-300"
            : "border-gray-200",
      )}
    >
      {/* Dot on timeline */}
      <div
        className={cn(
          "absolute left-0 top-0 -translate-x-1/2 w-[21px] h-[21px] rounded-full flex items-center justify-center border-2 transition-colors",
          isWinner
            ? "bg-emerald-500 border-emerald-500"
            : isLatest
              ? "bg-brand-500 border-brand-500"
              : "bg-white border-gray-300",
        )}
      >
        {isWinner ? (
          <CheckCircle2 className="w-[11px] h-[11px] text-white" />
        ) : isLatest ? (
          <Loader2 className="w-[10px] h-[10px] text-white animate-spin" />
        ) : (
          <div className="w-[7px] h-[7px] rounded-full bg-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="pb-6 space-y-3">
        {/* Header Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-sm font-bold",
              isWinner
                ? "text-emerald-700"
                : isLatest
                  ? "text-brand-700"
                  : "text-gray-900",
            )}
          >
            {t("agent.roundLabel", { round: item.round })}
          </span>

          <span className="text-xs font-mono text-gray-400">
            v{item.version}
          </span>

          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              item.score >= 90
                ? "bg-emerald-50 text-emerald-700"
                : item.score >= 80
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700",
            )}
          >
            {t("agent.scoreLabel", { score: item.score })}
          </span>

          {item.improvement > 0 && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              <ArrowUp className="w-3 h-3" />
              {t("agent.improvementLabel", { diff: item.improvement })}
            </span>
          )}

          {isWinner && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {t("agent.targetReached")}
            </span>
          )}
        </div>

        {/* Strategy */}
        <div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {t("agent.strategy")}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {item.strategy}
          </p>
        </div>

        {/* LLM Thought */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {t("agent.thought")}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed italic">
            &ldquo;{item.thought}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Results Summary                                                    */
/* ------------------------------------------------------------------ */

function ResultsSummary({
  session,
  t,
}: {
  session: AgentSession;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (session.status !== "completed" || session.rounds.length === 0) return null;

  const roundsTaken = session.rounds.length;
  const hitTarget = (session.winnerScore ?? 0) >= session.targetScore;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border overflow-hidden",
        hitTarget ? "border-emerald-200" : "border-amber-200",
      )}
    >
      <div
        className={cn(
          "px-5 py-4 border-b flex items-center gap-2",
          hitTarget ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100",
        )}
      >
        <Trophy
          className={cn("w-5 h-5", hitTarget ? "text-emerald-500" : "text-amber-500")}
        />
        <h2 className="text-sm font-bold text-gray-900">
          {t("agent.results")}
        </h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Winner Banner */}
        <div className="text-center">
          {hitTarget ? (
            <p className="text-lg font-bold text-emerald-700">
              {t("agent.results.success", {
                rounds: roundsTaken,
                version: session.winnerVersion ?? 0,
                score: session.winnerScore ?? 0,
              })}
            </p>
          ) : (
            <p className="text-lg font-bold text-amber-700">
              {t("agent.results.notReached", {
                rounds: roundsTaken,
                version: session.winnerVersion ?? 0,
                score: session.winnerScore ?? 0,
              })}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              {t("agent.results.rounds")}
            </div>
            <div className="text-lg font-bold text-gray-900">{roundsTaken}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              {t("agent.results.bestScore")}
            </div>
            <div className="text-lg font-bold text-emerald-600">
              {session.winnerScore ?? "--"}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              {t("agent.results.improvement")}
            </div>
            <div className="text-lg font-bold text-emerald-600 flex items-center justify-center gap-0.5">
              <TrendingUp className="w-4 h-4" />
              {session.totalImprovement != null && session.totalImprovement > 0
                ? `+${session.totalImprovement}`
                : session.totalImprovement ?? "--"}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              {t("agent.results.winnerVersion")}
            </div>
            <div className="text-lg font-bold text-gray-900">
              v{session.winnerVersion ?? "--"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AgentPage() {
  const params = useParams<{ projectId: string; promptId: string }>();
  const { projectId, promptId } = params;
  const { t } = useLanguage();

  /* ---- Config ---- */
  const [config, setConfig] = useState<AgentConfig>({
    targetScore: DEFAULT_TARGET_SCORE,
    maxIterations: DEFAULT_MAX_ITERATIONS,
  });

  /* ---- Session state ---- */
  const [session, setSession] = useState<AgentSession | null>(null);
  const [baselineInfo, setBaselineInfo] = useState<{
    version: number;
    score: number;
  } | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* ---- Polling ---- */
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Clear polling on unmount ---- */
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  /* ---- Fetch baseline info on mount ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadBaseline() {
      setLoadingBaseline(true);
      setFetchError(null);
      try {
        // Fetch prompt detail to get latest version
        const promptRes = await fetch(`/api/prompts/${promptId}`);
        if (!promptRes.ok) {
          const body = await promptRes.json().catch(() => null);
          throw new Error(body?.error ?? t("error.loadStatus", { status: promptRes.status }));
        }
        const promptData = await promptRes.json();

        if (!promptData.versions || promptData.versions.length === 0) {
          throw new Error(t("agent.error.noVersions"));
        }

        const latestVersion = promptData.versions[0];

        // Fetch experiments for this prompt to get baseline score
        const expRes = await fetch(`/api/experiments?promptId=${promptId}`);
        let baselineScore = 50; // Default fallback
        if (expRes.ok) {
          const exps = await expRes.json();
          const completedExps = exps.filter(
            (e: { status: string }) => e.status === "completed",
          );
          if (completedExps.length > 0) {
            // Average of completed experiment scores as baseline
            const scores: number[] = [];
            for (const exp of completedExps) {
              let results = exp.results;
              if (typeof results === "string") {
                try {
                  results = JSON.parse(results);
                } catch {
                  continue;
                }
              }
              if (results) {
                scores.push(results.baselineScore ?? 0);
                scores.push(results.candidateScore ?? 0);
              }
            }
            if (scores.length > 0) {
              baselineScore = Math.round(
                scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
              );
            }
          }
        }

        if (!cancelled) {
          setBaselineInfo({
            version: latestVersion.version,
            score: baselineScore,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : t("error.unexpected"));
        }
      } finally {
        if (!cancelled) {
          setLoadingBaseline(false);
        }
      }
    }

    if (promptId) loadBaseline();
    return () => {
      cancelled = true;
    };
  }, [promptId, t]);

  /* ---- Poll for optimization progress ---- */
  const startPolling = useCallback(
    (taskId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/agent/optimize?taskId=${taskId}`);
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            const errMsg =
              body?.error ?? t("error.loadStatus", { status: res.status });
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    status: "error",
                    errorMessage: errMsg,
                  }
                : null,
            );
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            return;
          }

          const data: AgentSession = await res.json();

          setSession(data);

          if (data.status === "completed" || data.status === "error") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        } catch (err) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  status: "error",
                  errorMessage:
                    err instanceof Error ? err.message : t("error.unexpected"),
                }
              : null,
          );
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }, POLL_INTERVAL_MS);
    },
    [t],
  );

  /* ---- Start optimization ---- */
  const handleStartOptimize = useCallback(async () => {
    if (!promptId) return;

    setSession({
      taskId: "",
      status: "running",
      promptId: Number(promptId),
      baselineVersion: baselineInfo?.version ?? 0,
      baselineScore: baselineInfo?.score ?? 0,
      targetScore: config.targetScore,
      maxIterations: config.maxIterations,
      rounds: [],
      winnerVersion: null,
      winnerScore: null,
      totalImprovement: null,
      errorMessage: null,
      createdAt: null,
    });

    setFetchError(null);

    try {
      const res = await fetch("/api/agent/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: Number(promptId),
          targetScore: config.targetScore,
          maxIterations: config.maxIterations,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errMsg =
          body?.error ?? t("error.loadStatus", { status: res.status });
        setSession((prev) =>
          prev
            ? { ...prev, status: "error", errorMessage: errMsg }
            : null,
        );
        return;
      }

      const data: AgentSession = await res.json();

      setSession(data);

      if (data.status === "running") {
        startPolling(data.taskId);
      }
    } catch (err) {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              errorMessage:
                err instanceof Error ? err.message : t("error.unexpected"),
            }
          : null,
      );
    }
  }, [promptId, baselineInfo, config, startPolling, t]);

  /* ---- Derived state ---- */
  const isRunning = session?.status === "running";
  const isCompleted = session?.status === "completed";
  const hasError = session?.status === "error" || fetchError !== null;
  const displayError =
    session?.status === "error"
      ? session.errorMessage
      : fetchError;
  const rounds = session?.rounds ?? [];

  /* ---- Render ---- */
  return (
    <div className="w-full px-4 pt-6 pb-12">
      {/* ---- TOP BAR ---- */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* Back link */}
          <Link
            href={`/dashboard/${projectId}/prompts/${promptId}`}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("prompt.back")}
          </Link>

          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Link
                href="/dashboard"
                className="hover:text-gray-600 transition-colors"
              >
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
              <span className="text-gray-600">{`Prompt #${promptId}`}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-400">{t("agent.title")}</span>
            </nav>

            {/* Title */}
            <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-brand-500" />
              {t("agent.title")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <LanguageSwitcher />
        </div>
      </div>

      {/* ---- ERROR STATE ---- */}
      {hasError && !isRunning && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {t("agent.error.title")}
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            {displayError}
          </p>
          <button
            type="button"
            onClick={() => {
              setSession(null);
              setFetchError(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            {t("dashboard.retry")}
          </button>
        </div>
      )}

      {/* ---- CONTENT ---- */}
      {!hasError && (
        <div className="space-y-8 max-w-3xl">
          {/* ---- Baseline Info Banner ---- */}
          {loadingBaseline ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          ) : baselineInfo ? (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    {t("agent.currentBaseline")}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    v{baselineInfo.version}
                  </span>
                </div>
                <div className="text-xs text-gray-300">|</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    {t("agent.baselineScore")}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      baselineInfo.score >= 80
                        ? "text-emerald-600"
                        : baselineInfo.score >= 60
                          ? "text-amber-600"
                          : "text-red-600",
                    )}
                  >
                    {baselineInfo.score}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* ---- Config Form ---- */}
          <ConfigForm
            config={config}
            onChange={setConfig}
            onSubmit={handleStartOptimize}
            running={isRunning}
            baselineExists={baselineInfo !== null}
            t={t}
          />

          {/* ---- Rounds (only when we have rounds or running) ---- */}
          {(rounds.length > 0 || isRunning) && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  {t("agent.progress")}
                </h2>
              </div>

              <div className="p-5">
                {/* Timeline */}
                <div className="space-y-0">
                  {rounds.map((round, idx) => (
                    <RoundCard
                      key={round.round}
                      item={round}
                      isLatest={
                        isRunning &&
                        idx === rounds.length - 1
                      }
                      isWinner={
                        isCompleted &&
                        session?.winnerVersion === round.version
                      }
                      t={t}
                    />
                  ))}
                </div>

                {/* Running spinner for no rounds yet */}
                {isRunning && rounds.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-4" />
                    <p className="text-sm text-gray-500">
                      {t("agent.preparing")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- Results Summary ---- */}
          {isCompleted && session && (
            <ResultsSummary session={session} t={t} />
          )}

          {/* ---- Completed: back-to-prompt link ---- */}
          {isCompleted && (
            <div className="text-center">
              <Link
                href={`/dashboard/${projectId}/prompts/${promptId}`}
                className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-700 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("agent.backToPrompt")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
