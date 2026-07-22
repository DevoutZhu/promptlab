"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, FolderKanban, FileText, FlaskConical, Star,
  Search, Sparkles, Trash2, X, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { ProjectCard } from "@/components/ProjectCard";
import { cn } from "@/lib/cn";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectItem {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  promptCount: number;
}

interface PageState {
  projects: ProjectItem[];
  loading: boolean;
  error: string | null;
  search: string;
  showCreateModal: boolean;
  deletingId: number | null;
}

const INITIAL_STATE: PageState = {
  projects: [],
  loading: true,
  error: null,
  search: "",
  showCreateModal: false,
  deletingId: null,
};

/* ------------------------------------------------------------------ */
/*  Skeleton components                                                */
/* ------------------------------------------------------------------ */

function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 mb-4" />
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-full bg-gray-100 rounded mb-1.5" />
      <div className="h-4 w-2/3 bg-gray-100 rounded mb-5" />
      <div className="flex items-center gap-3">
        <div className="h-3.5 w-16 bg-gray-100 rounded" />
        <div className="h-3.5 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="w-12 h-5 rounded-md bg-gray-100" />
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
      <div className="h-4 w-24 bg-gray-100 rounded" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateProjectModal — standalone, no Portal, rendered FIRST in DOM */
/* ------------------------------------------------------------------ */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

function CreateProjectModal({ open, onClose, onCreate }: ModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setError(null);
    setSubmitting(false);
    const timer = setTimeout(() => nameRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [open]);

  // ESC key — registered independently so it always works
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("modal.nameRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(trimmed, description.trim());
      // Parent will call onClose after state update — do NOT close here
    } catch (err) {
      setError(err instanceof Error ? err.message : t("modal.createFailed"));
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.4)",
        padding: "1rem",
      }}
      onClick={submitting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        style={{ pointerEvents: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {t("modal.createProject")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("modal.name")} <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("modal.namePlaceholder")}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              maxLength={255}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("modal.description")}
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("modal.descriptionPlaceholder")}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors resize-none"
              maxLength={2000}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {t("modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t("modal.creating") : t("modal.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<PageState>(INITIAL_STATE);

  /* ---- Fetch projects (atomic) ---- */
  const fetchProjects = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t("error.loadStatus", { status: res.status }));
      }
      const data: ProjectItem[] = await res.json();
      setState((prev) => ({ ...prev, projects: data, loading: false, error: null }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : t("error.unexpected"),
      }));
    }
  }, [t]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* ---- Create project (atomic: add + close modal in one shot) ---- */
  const handleCreate = useCallback(async (name: string, description: string) => {
    const payload: Record<string, string> = { name };
    if (description) payload.description = description;

    let res: Response;
    try {
      res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(t("error.network"));
    }

    let data: Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new Error(t("error.parseResponse", { status: res.status }));
    }

    if (!res.ok) {
      throw new Error(
        (typeof data?.error === "string" ? data.error : null) ??
          t("error.createStatus", { status: res.status }),
      );
    }

    const newProject: ProjectItem = {
      ...(data as unknown as ProjectItem),
      promptCount: (data.promptCount as number) ?? 0,
    };

    // Single atomic update: prepend project AND close modal
    setState((prev) => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      showCreateModal: false,
    }));
  }, [t]);

  /* ---- Delete project (atomic: remove from list) ---- */
  const handleDelete = useCallback(
    async (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!confirm(t("delete.confirm"))) {
        return;
      }

      setState((prev) => ({ ...prev, deletingId: id }));
      try {
        const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? t("delete.failed"));
        }
        setState((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p.id !== id),
          deletingId: null,
        }));
      } catch (err) {
        alert(err instanceof Error ? err.message : t("delete.failed"));
        setState((prev) => ({ ...prev, deletingId: null }));
      }
    },
    [t],
  );

  /* ---- Derived data ---- */
  const totalPrompts = state.projects.reduce((sum, p) => sum + p.promptCount, 0);
  const filtered = state.search.trim()
    ? state.projects.filter(
        (p) =>
          p.name.toLowerCase().includes(state.search.toLowerCase()) ||
          (p.description ?? "").toLowerCase().includes(state.search.toLowerCase()),
      )
    : state.projects;
  const isEmpty = !state.loading && !state.error && state.projects.length === 0;

  /* ---- Render ---- */
  return (
    <>
      {/* ================================================================ */}
      {/*  MODAL — rendered FIRST in DOM order (top of tree).              */}
      {/*  Uses style prop with explicit top/left/right/bottom:0           */}
      {/*  instead of inset-0 for maximum browser compatibility.           */}
      {/*  No parent transform/filter/overflow can affect its positioning. */}
      {/* ================================================================ */}
      <CreateProjectModal
        open={state.showCreateModal}
        onClose={() => setState((prev) => ({ ...prev, showCreateModal: false }))}
        onCreate={handleCreate}
      />

      {/* ---- PAGE CONTENT ---- */}
      <div className="w-full px-4 pt-6 pb-12">
        {/* ---- TOP BAR: title + LanguageSwitcher + action button ---- */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              {t("dashboard.title")}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, showCreateModal: true }))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              {t("dashboard.createProject")}
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* ---- STATS ROW ---- */}
          {state.loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label={t("stats.totalProjects")} value={state.projects.length} icon={FolderKanban} />
              <StatCard label={t("stats.totalPrompts")} value={totalPrompts} icon={FileText} />
              <StatCard label={t("stats.activeExperiments")} value={0} icon={FlaskConical} />
              <StatCard label={t("stats.avgScore")} value="--" icon={Star} />
            </div>
          )}

          {/* ---- ERROR STATE ---- */}
          {state.error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {t("dashboard.loadError")}
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mb-6">{state.error}</p>
              <button
                type="button"
                onClick={fetchProjects}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                {t("dashboard.retry")}
              </button>
            </div>
          )}

          {/* ---- CONTENT (no error) ---- */}
          {!state.error && (
            <>
              {/* Search */}
              {!state.loading && !isEmpty && (
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={state.search}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, search: e.target.value }))
                    }
                    placeholder={t("dashboard.searchPlaceholder")}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
              )}

              {/* ---- PROJECT GRID ---- */}
              {state.loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              ) : isEmpty ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-brand-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("dashboard.empty.title")}
                  </h2>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    {t("dashboard.empty.desc")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, showCreateModal: true }))}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    {t("dashboard.empty.button")}
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                /* No search results */
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-sm text-gray-500">
                    {t("dashboard.noResults")}
                    {" "}
                    <span className="font-medium text-gray-700">&quot;{state.search}&quot;</span>
                    {t("dashboard.noResults.suffix")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, search: "" }))}
                    className="mt-2 text-sm text-brand-500 hover:text-brand-700 transition-colors"
                  >
                    {t("dashboard.clearSearch")}
                  </button>
                </div>
              ) : (
                /* Project cards grid */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((project) => (
                    <div key={project.id} className="relative group/card">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(project.id, e)}
                        disabled={state.deletingId === project.id}
                        className={cn(
                          "absolute top-3 right-3 z-10 p-1.5 rounded-lg",
                          "text-gray-400 hover:text-red-500 hover:bg-red-50",
                          "opacity-0 group-hover/card:opacity-100 transition-all",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                        title={t("delete.title")}
                      >
                        {state.deletingId === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <ProjectCard
                        name={project.name}
                        description={project.description ?? ""}
                        promptCount={project.promptCount}
                        updatedAt={project.createdAt}
                        href={`/dashboard/${project.id}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
