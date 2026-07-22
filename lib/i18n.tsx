"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Language = "zh" | "en";

type TranslationValue = string | ((params: Record<string, string | number>) => string);

type TranslationDict = Record<string, TranslationValue>;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const translations: Record<Language, TranslationDict> = {
  zh: {
    /* ---- AppShell / Sidebar ---- */
    "sidebar.menu": "菜单",
    "sidebar.projects": "项目",
    "sidebar.settings": "设置",
    "sidebar.experiments": "实验",
    "sidebar.analytics": "数据分析",
    "sidebar.versions": "版本",
    "sidebar.tools": "工具",
    "sidebar.help": "帮助",
    "sidebar.collapse": "折叠侧边栏",
    "sidebar.expand": "展开侧边栏",

    /* ---- Homepage - Hero ---- */
    "home.badge": "公开测试中",
    "home.hero.title1": "像管理代码一样",
    "home.hero.title2": "管理提示词",
    "home.hero.subtitle": "开源提示词管理平台。用管理代码的严谨方式来版本化、测试和部署你的 LLM 提示词。",
    "home.hero.createProject": "创建项目",
    "home.hero.viewDocs": "查看文档",
    "home.hero.getStarted": "免费开始使用",
    "home.hero.starGithub": "在 GitHub 上标星",

    /* ---- Homepage - Features ---- */
    "home.features.heading1": "更快地交付更好的提示词",
    "home.features.heading2": "所需的一切工具",
    "home.features.subtitle": "覆盖提示词完整生命周期的专用工具——从初稿到生产监控。",

    "home.features.vc.title": "版本控制",
    "home.features.vc.desc": "通过类似 Git 的差异对比、分支和回滚功能追踪每一次提示词变更。再也不会丢失可用的提示词。",

    "home.features.ab.title": "A/B 测试",
    "home.features.ab.desc": "跨多个 LLM 提供商运行对照实验。测量延迟、成本和质量——然后发布胜出版本。",

    "home.features.collab.title": "团队协作",
    "home.features.collab.desc": "与团队一起审查提示词变更，添加行内评论，仅在所有人同意时合并。",

    /* ---- Homepage - How It Works ---- */
    "home.steps.label": "使用流程",
    "home.steps.heading1": "从实验到生产",
    "home.steps.heading2": "只需三步",
    "home.steps.subtitle": "无需复杂设置。几分钟内即可开始运行实验。",

    "home.steps.connect.title": "连接你的 LLM",
    "home.steps.connect.desc": "自带 OpenAI、Anthropic、Google 或任何兼容 OpenAI 接口的 API 密钥。PromptLab 绝不存储你的密钥。",

    "home.steps.test.title": "编写测试和基准",
    "home.steps.test.desc": "定义带预期输出的测试用例，设置质量阈值，一键跨模型进行基准测试。",

    "home.steps.ship.title": "自信发布",
    "home.steps.ship.desc": "一键将胜出的提示词提升到生产环境。如果指标回退，即刻回滚。",

    /* ---- Homepage - CTA ---- */
    "home.cta.heading": "准备好像对待生产代码一样对待你的提示词了吗？",
    "home.cta.subtitle": "开源。可自托管或云端使用。两分钟内即可开始。",

    /* ---- Homepage - Footer ---- */
    "home.footer.tagline": "PromptLab —— 开源提示词管理平台",
    "home.footer.docs": "文档",
    "home.footer.blog": "博客",

    /* ---- Dashboard ---- */
    "dashboard.title": "项目",
    "dashboard.subtitle": "管理你的提示词项目和实验",
    "dashboard.createProject": "创建项目",
    "dashboard.searchPlaceholder": "搜索项目...",
    "dashboard.empty.title": "暂无项目",
    "dashboard.empty.desc": "创建你的第一个项目，开始管理提示词、运行实验并追踪质量评分。",
    "dashboard.empty.button": "创建第一个项目",
    "dashboard.noResults": "没有匹配",
    "dashboard.noResults.suffix": "的项目",
    "dashboard.clearSearch": "清除搜索",
    "dashboard.loadError": "加载项目失败",
    "dashboard.retry": "重试",

    /* ---- Dashboard - Stats ---- */
    "stats.totalProjects": "项目总数",
    "stats.totalPrompts": "提示词总数",
    "stats.activeExperiments": "活跃实验",
    "stats.avgScore": "平均分",

    /* ---- Modal ---- */
    "modal.createProject": "创建项目",
    "modal.name": "名称",
    "modal.namePlaceholder": "例如：客服机器人",
    "modal.description": "描述",
    "modal.descriptionPlaceholder": "简要描述此项目...",
    "modal.cancel": "取消",
    "modal.creating": "创建中...",
    "modal.create": "创建项目",
    "modal.nameRequired": "项目名称不能为空",
    "modal.createFailed": "创建项目失败",

    /* ---- Delete ---- */
    "delete.confirm": "确定要删除此项目吗？此操作不可撤销。",
    "delete.failed": "删除项目失败",
    "delete.title": "删除项目",

    /* ---- Errors ---- */
    "error.network": "网络错误：无法连接到服务器，请检查网络连接。",
    "error.parseResponse": "服务器返回了状态码 {status}，但无法解析响应。",
    "error.createStatus": "创建项目失败（状态码 {status}）",
    "error.loadStatus": "请求失败（{status}）",
    "error.unexpected": "发生未知错误",

    /* ---- ProjectCard ---- */
    "projectcard.prompt": "个提示词",
    "projectcard.prompts": "个提示词",
    "projectcard.justNow": "刚刚",
    "projectcard.minAgo": "{n} 分钟前",
    "projectcard.hourAgo": "{n} 小时前",
    "projectcard.dayAgo": "{n} 天前",
    "projectcard.weekAgo": "{n} 周前",

    /* ---- ScoreChart ---- */
    "scorechart.title": "评分趋势",
    "scorechart.score": "评分",
    "scorechart.avg": "平均",
    "scorechart.noData": "暂无评分数据",

    /* ---- Status Badges ---- */
    "status.active": "活跃",
    "status.experiment": "实验中",
    "status.draft": "草稿",
    "status.running": "运行中",
    "status.completed": "已完成",
    "status.baseline": "基线",
    "status.candidate": "候选",
    "status.tie": "平局",

    /* ---- Experiment winner display ---- */
    "experiment.baselineWins": "基线胜出",
    "experiment.candidateWins": "候选胜出",
    "experiment.scoreDiff": "+{diff} 分",

    /* ---- Project Detail ---- */
    "project.breadcrumb": "项目",
    "project.newPrompt": "新建提示词",
    "project.loadError": "加载项目失败",
    "project.stats.totalPrompts": "提示词总数",
    "project.stats.versions": "版本数",
    "project.table.prompts": "提示词",
    "project.table.total": "{count} 个",
    "project.table.name": "名称",
    "project.table.version": "版本",
    "project.table.updated": "更新日期",
    "project.table.status": "状态",
    "project.table.score": "评分",
    "project.table.empty": "暂无提示词。",
    "project.table.createFirst": "创建第一个提示词",
    "project.experiments": "实验",
    "project.experiments.empty": "暂无实验",
    "project.quickActions": "快捷操作",
    "project.actions.batchEval": "批量评测",
    "project.actions.export": "导出所有提示词",
    "project.actions.changeLog": "查看变更日志",

    /* ---- Prompt Detail ---- */
    "prompt.back": "返回",
    "prompt.breadcrumb": "项目",
    "prompt.loadError": "加载提示词失败",
    "prompt.template": "提示词模板",
    "prompt.versionComparison": "版本对比",
    "prompt.compare": "对比",
    "prompt.exitDiff": "退出对比",
    "prompt.copy": "复制",
    "prompt.copied": "已复制",
    "prompt.edit": "编辑",
    "prompt.diffLeft": "左侧：",
    "prompt.diffRight": "右侧：",
    "prompt.diffVs": "对比",
    "prompt.saveChanges": "保存修改",
    "prompt.saving": "保存中...",
    "prompt.cancel": "取消",
    "prompt.saveFailed": "保存失败",
    "prompt.newExperiment": "新建实验",
    "prompt.versionHistory": "版本历史",
    "prompt.versionsCount": "{count} 个版本",
    "prompt.versionCurrent": "当前",
    "prompt.versionViewing": "查看中",
    "prompt.versionId": "ID：",
    "prompt.versionDesc": "版本 {version}",
    "prompt.variables": "变量",
    "prompt.variables.empty": "此版本中没有变量",
    "prompt.evaluation": "评测",
    "prompt.eval.passed": "通过",
    "prompt.eval.failed": "未通过",
    "prompt.eval.totalCases": "总用例：{count}",
    "prompt.eval.lastRun": "上次运行：{date}",
    "prompt.eval.empty": "暂无评测数据。",
    "prompt.eval.emptyHint": "运行实验以查看评分。",
    "prompt.actions": "操作",
    "prompt.actions.runExperiment": "运行实验",
    "prompt.actions.rerunEval": "重新评测",
    "prompt.actions.needMoreVersions": "需要至少2个版本才能创建实验",
    "prompt.actions.duplicate": "复制提示词",
  },

  en: {
    /* ---- AppShell / Sidebar ---- */
    "sidebar.menu": "Menu",
    "sidebar.projects": "Projects",
    "sidebar.settings": "Settings",
    "sidebar.experiments": "Experiments",
    "sidebar.analytics": "Analytics",
    "sidebar.versions": "Versions",
    "sidebar.tools": "Tools",
    "sidebar.help": "Help",
    "sidebar.collapse": "Collapse sidebar",
    "sidebar.expand": "Expand sidebar",

    /* ---- Homepage - Hero ---- */
    "home.badge": "Now in Public Beta",
    "home.hero.title1": "Manage Prompts",
    "home.hero.title2": "Like Code",
    "home.hero.subtitle": "The open-source prompt management platform. Version, test, and deploy your LLM prompts with the same rigor you apply to your codebase.",
    "home.hero.createProject": "Create Project",
    "home.hero.viewDocs": "View Docs",
    "home.hero.getStarted": "Get Started Free",
    "home.hero.starGithub": "Star on GitHub",

    /* ---- Homepage - Features ---- */
    "home.features.heading1": "Everything you need to ship",
    "home.features.heading2": "better prompts, faster",
    "home.features.subtitle": "Purpose-built tools for the entire prompt lifecycle — from first draft to production monitoring.",

    "home.features.vc.title": "Version Control",
    "home.features.vc.desc": "Track every change to your prompts with Git-like diffs, branching, and rollback. Never lose a working prompt again.",

    "home.features.ab.title": "A/B Testing",
    "home.features.ab.desc": "Run controlled experiments across multiple LLM providers. Measure latency, cost, and quality — then ship the winner.",

    "home.features.collab.title": "Team Collaboration",
    "home.features.collab.desc": "Review prompt changes with your team, leave inline comments, and merge only when everyone agrees.",

    /* ---- Homepage - How It Works ---- */
    "home.steps.label": "How It Works",
    "home.steps.heading1": "From experiment to production",
    "home.steps.heading2": "in three steps",
    "home.steps.subtitle": "No complex setup. Start running experiments in minutes.",

    "home.steps.connect.title": "Connect Your LLM",
    "home.steps.connect.desc": "Bring your own API keys for OpenAI, Anthropic, Google, or any OpenAI-compatible provider. PromptLab never stores your keys.",

    "home.steps.test.title": "Write Tests & Benchmarks",
    "home.steps.test.desc": "Define test cases with expected outputs, set quality thresholds, and benchmark across models in a single click.",

    "home.steps.ship.title": "Ship Confidently",
    "home.steps.ship.desc": "Promote winning prompts to production with a single click. Roll back instantly if metrics regress.",

    /* ---- Homepage - CTA ---- */
    "home.cta.heading": "Ready to treat your prompts like production code?",
    "home.cta.subtitle": "Open source. Self-hosted or cloud. Start in under 2 minutes.",

    /* ---- Homepage - Footer ---- */
    "home.footer.tagline": "PromptLab — Open-source prompt management platform",
    "home.footer.docs": "Docs",
    "home.footer.blog": "Blog",

    /* ---- Dashboard ---- */
    "dashboard.title": "Projects",
    "dashboard.subtitle": "Manage your prompt projects and experiments",
    "dashboard.createProject": "Create Project",
    "dashboard.searchPlaceholder": "Search projects...",
    "dashboard.empty.title": "No projects yet",
    "dashboard.empty.desc": "Create your first project to start managing prompts, running experiments, and tracking quality scores.",
    "dashboard.empty.button": "Create Your First Project",
    "dashboard.noResults": "No projects match",
    "dashboard.noResults.suffix": "",
    "dashboard.clearSearch": "Clear search",
    "dashboard.loadError": "Failed to load projects",
    "dashboard.retry": "Retry",

    /* ---- Dashboard - Stats ---- */
    "stats.totalProjects": "Total Projects",
    "stats.totalPrompts": "Total Prompts",
    "stats.activeExperiments": "Active Experiments",
    "stats.avgScore": "Avg Score",

    /* ---- Modal ---- */
    "modal.createProject": "Create Project",
    "modal.name": "Name",
    "modal.namePlaceholder": "e.g. Customer Support Bot",
    "modal.description": "Description",
    "modal.descriptionPlaceholder": "Brief description of this project...",
    "modal.cancel": "Cancel",
    "modal.creating": "Creating...",
    "modal.create": "Create Project",
    "modal.nameRequired": "Project name is required.",
    "modal.createFailed": "Failed to create project.",

    /* ---- Delete ---- */
    "delete.confirm": "Are you sure you want to delete this project? This action cannot be undone.",
    "delete.failed": "Failed to delete project",
    "delete.title": "Delete project",

    /* ---- Errors ---- */
    "error.network": "Network error: unable to reach the server. Please check your connection.",
    "error.parseResponse": "Server returned status {status} but the response could not be parsed.",
    "error.createStatus": "Failed to create project (status {status})",
    "error.loadStatus": "Request failed ({status})",
    "error.unexpected": "An unexpected error occurred",

    /* ---- ProjectCard ---- */
    "projectcard.prompt": "prompt",
    "projectcard.prompts": "prompts",
    "projectcard.justNow": "just now",
    "projectcard.minAgo": "{n}m ago",
    "projectcard.hourAgo": "{n}h ago",
    "projectcard.dayAgo": "{n}d ago",
    "projectcard.weekAgo": "{n}w ago",

    /* ---- ScoreChart ---- */
    "scorechart.title": "Score Trend",
    "scorechart.score": "Score",
    "scorechart.avg": "Avg",
    "scorechart.noData": "No score data available yet.",

    /* ---- Status Badges ---- */
    "status.active": "Active",
    "status.experiment": "Experiment",
    "status.draft": "Draft",
    "status.running": "running",
    "status.completed": "completed",
    "status.baseline": "Baseline",
    "status.candidate": "Candidate",
    "status.tie": "Tie",

    /* ---- Experiment winner display ---- */
    "experiment.baselineWins": "Baseline Wins",
    "experiment.candidateWins": "Candidate Wins",
    "experiment.scoreDiff": "+{diff} pts",

    /* ---- Project Detail ---- */
    "project.breadcrumb": "Projects",
    "project.newPrompt": "New Prompt",
    "project.loadError": "Failed to load project",
    "project.stats.totalPrompts": "Total Prompts",
    "project.stats.versions": "Versions",
    "project.table.prompts": "Prompts",
    "project.table.total": "{count} total",
    "project.table.name": "Name",
    "project.table.version": "Version",
    "project.table.updated": "Updated",
    "project.table.status": "Status",
    "project.table.score": "Score",
    "project.table.empty": "No prompts yet.",
    "project.table.createFirst": "Create your first prompt",
    "project.experiments": "Experiments",
    "project.experiments.empty": "No experiments yet",
    "project.quickActions": "Quick Actions",
    "project.actions.batchEval": "Run Batch Evaluation",
    "project.actions.export": "Export All Prompts",
    "project.actions.changeLog": "View Change Log",

    /* ---- Prompt Detail ---- */
    "prompt.back": "Back",
    "prompt.breadcrumb": "Projects",
    "prompt.loadError": "Failed to load prompt",
    "prompt.template": "Prompt Template",
    "prompt.versionComparison": "Version Comparison",
    "prompt.compare": "Compare",
    "prompt.exitDiff": "Exit Diff",
    "prompt.copy": "Copy",
    "prompt.copied": "Copied",
    "prompt.edit": "Edit",
    "prompt.diffLeft": "Left:",
    "prompt.diffRight": "Right:",
    "prompt.diffVs": "vs",
    "prompt.saveChanges": "Save Changes",
    "prompt.saving": "Saving...",
    "prompt.cancel": "Cancel",
    "prompt.saveFailed": "Failed to save",
    "prompt.newExperiment": "New Experiment",
    "prompt.versionHistory": "Version History",
    "prompt.versionsCount": "{count} versions",
    "prompt.versionCurrent": "current",
    "prompt.versionViewing": "viewing",
    "prompt.versionId": "ID:",
    "prompt.versionDesc": "Version {version}",
    "prompt.variables": "Variables",
    "prompt.variables.empty": "No variables in this version",
    "prompt.evaluation": "Evaluation",
    "prompt.eval.passed": "Passed",
    "prompt.eval.failed": "Failed",
    "prompt.eval.totalCases": "Total cases: {count}",
    "prompt.eval.lastRun": "Last run: {date}",
    "prompt.eval.empty": "No evaluation data yet.",
    "prompt.eval.emptyHint": "Run an experiment to see scores.",
    "prompt.actions": "Actions",
    "prompt.actions.runExperiment": "Run Experiment",
    "prompt.actions.rerunEval": "Re-run Evaluation",
    "prompt.actions.needMoreVersions": "Need at least 2 versions to create an experiment",
    "prompt.actions.duplicate": "Duplicate Prompt",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/* ------------------------------------------------------------------ */
/*  Storage key                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "promptlab-language";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const LanguageContext = createContext<LanguageContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");
  const [mounted, setMounted] = useState(false);

  /* Read persisted language on mount (client-only) */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "zh") {
        setLanguageState(stored);
      }
    } catch {
      // localStorage unavailable — stay with default
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const p = params ?? {};
      const dict = translations[language];
      const raw = dict[key];
      if (raw === undefined) {
        // Fallback to English, then key itself
        const enRaw = translations.en[key];
        if (enRaw !== undefined) {
          if (typeof enRaw === "function") return enRaw(p);
          return p && Object.keys(p).length > 0 ? interpolate(enRaw, p) : enRaw;
        }
        return key;
      }
      if (typeof raw === "function") return raw(p);
      return p && Object.keys(p).length > 0 ? interpolate(raw, p) : raw;
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  /* Suppress hydration mismatch by rendering children only after mount.
   * This is safe because language is a purely presentational preference. */
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Return default values when used outside provider (SSR-safe)
    return {
      language: "zh" as Language,
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        const p = params ?? {};
        const val = translations.zh[key];
        if (typeof val === "function") return val(p);
        if (val !== undefined) {
          return Object.keys(p).length > 0 ? interpolate(val, p) : val;
        }
        return key;
      },
    };
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Language Switcher Button                                           */
/* ------------------------------------------------------------------ */

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-medium ${className ?? ""}`}
      role="radiogroup"
      aria-label="Switch language"
    >
      <button
        type="button"
        role="radio"
        aria-checked={language === "zh"}
        onClick={() => setLanguage("zh")}
        className={`rounded-md px-2 py-1 transition-colors ${
          language === "zh"
            ? "bg-brand-500 text-white shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        中
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={language === "en"}
        onClick={() => setLanguage("en")}
        className={`rounded-md px-2 py-1 transition-colors ${
          language === "en"
            ? "bg-brand-500 text-white shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default translations;
