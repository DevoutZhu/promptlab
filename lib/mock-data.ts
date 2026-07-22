import type { LucideIcon } from "lucide-react";

// ---- Types ----

export interface Project {
  id: string;
  name: string;
  description: string;
  promptCount: number;
  updatedAt: string;
  activeExperiments: number;
  avgScore: number;
}

export interface Prompt {
  id: string;
  projectId: string;
  name: string;
  version: string;
  updatedAt: string;
  score: number | null;
  status: "active" | "draft" | "archived";
  content: string;
  variables: string[];
  evaluations: Evaluation[];
}

export interface PromptVersion {
  version: string;
  content: string;
  updatedAt: string;
  score: number | null;
  status: "active" | "draft" | "archived";
}

export interface Experiment {
  id: string;
  name: string;
  projectId: string;
  promptId: string;
  status: "running" | "completed" | "pending";
  score: number | null;
  createdAt: string;
}

export interface Evaluation {
  id: string;
  experimentName: string;
  score: number;
  date: string;
  metrics: { name: string; value: number }[];
}

// ---- Mock Projects ----

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Customer Support Bot",
    description: "LLM prompts for the automated customer support chatbot handling tier-1 inquiries across email and chat channels.",
    promptCount: 12,
    updatedAt: "2026-07-20",
    activeExperiments: 3,
    avgScore: 87.4,
  },
  {
    id: "proj-2",
    name: "Content Summarizer",
    description: "Prompts for summarizing long-form articles, legal documents, and meeting transcripts into concise executive briefs.",
    promptCount: 8,
    updatedAt: "2026-07-18",
    activeExperiments: 1,
    avgScore: 82.1,
  },
  {
    id: "proj-3",
    name: "Code Review Assistant",
    description: "Prompt templates for automated code review: bug detection, style enforcement, and security vulnerability scanning.",
    promptCount: 15,
    updatedAt: "2026-07-21",
    activeExperiments: 5,
    avgScore: 91.2,
  },
  {
    id: "proj-4",
    name: "Email Composer",
    description: "Context-aware email composition prompts for sales outreach, follow-ups, and internal communications.",
    promptCount: 6,
    updatedAt: "2026-07-15",
    activeExperiments: 0,
    avgScore: 78.9,
  },
];

// ---- Mock Prompts ----

export const mockPrompts: Prompt[] = [
  {
    id: "p-1",
    projectId: "proj-1",
    name: "Initial Triage Classifier",
    version: "v3",
    updatedAt: "2026-07-20",
    score: 92.5,
    status: "active",
    content: `You are a customer support triage agent for {{company_name}}.

Classify the following customer inquiry into one of these categories:
- {{category_billing}}
- {{category_technical}}
- {{category_account}}
- {{category_general}}

Customer Inquiry: {{user_message}}

Respond with ONLY the category name and a confidence score (0-100).`,
    variables: ["company_name", "category_billing", "category_technical", "category_account", "category_general", "user_message"],
    evaluations: [
      { id: "eval-1", experimentName: "v3 Baseline", score: 92.5, date: "2026-07-20", metrics: [{ name: "Accuracy", value: 94 }, { name: "Latency", value: 1.2 }, { name: "Cost", value: 0.003 }] },
      { id: "eval-2", experimentName: "Few-shot Variant", score: 89.3, date: "2026-07-19", metrics: [{ name: "Accuracy", value: 91 }, { name: "Latency", value: 1.5 }, { name: "Cost", value: 0.005 }] },
    ],
  },
  {
    id: "p-2",
    projectId: "proj-1",
    name: "Refund Request Handler",
    version: "v2",
    updatedAt: "2026-07-19",
    score: 85.7,
    status: "active",
    content: `You are a refund processing agent for {{company_name}}.

Given the following order details, determine if a refund should be issued:
- Order ID: {{order_id}}
- Purchase Date: {{purchase_date}}
- Reason: {{refund_reason}}
- Order Amount: {{order_amount}}

Refund Policy: {{refund_policy}}

Respond with a JSON object: {"eligible": boolean, "amount": number, "reasoning": string}`,
    variables: ["company_name", "order_id", "purchase_date", "refund_reason", "order_amount", "refund_policy"],
    evaluations: [
      { id: "eval-3", experimentName: "v2 Current", score: 85.7, date: "2026-07-19", metrics: [{ name: "Accuracy", value: 88 }, { name: "Latency", value: 1.8 }, { name: "Cost", value: 0.004 }] },
    ],
  },
  {
    id: "p-3",
    projectId: "proj-1",
    name: "Escalation Detector",
    version: "v1",
    updatedAt: "2026-07-17",
    score: null,
    status: "draft",
    content: `Analyze the conversation history and determine if escalation to a human agent is needed.

Conversation:
{{conversation_history}}

Escalation triggers:
- {{trigger_list}}

Return: {"escalate": boolean, "urgency": "low" | "medium" | "high", "summary": string}`,
    variables: ["conversation_history", "trigger_list"],
    evaluations: [],
  },
  {
    id: "p-4",
    projectId: "proj-2",
    name: "Article Summarizer",
    version: "v4",
    updatedAt: "2026-07-18",
    score: 88.1,
    status: "active",
    content: `Summarize the following article in {{target_length}} words.

Article Title: {{article_title}}
Article Content:
{{article_content}}

Target Audience: {{target_audience}}
Style: {{summary_style}}

Provide:
1. A one-line summary
2. Key points (3-5 bullets)
3. A detailed summary`,
    variables: ["target_length", "article_title", "article_content", "target_audience", "summary_style"],
    evaluations: [
      { id: "eval-4", experimentName: "v4 Production", score: 88.1, date: "2026-07-18", metrics: [{ name: "ROUGE-L", value: 0.72 }, { name: "Factuality", value: 95 }, { name: "Latency", value: 2.1 }] },
    ],
  },
  {
    id: "p-5",
    projectId: "proj-3",
    name: "Bug Detector",
    version: "v2",
    updatedAt: "2026-07-21",
    score: 93.8,
    status: "active",
    content: `You are a code review assistant specializing in {{language}}.

Review the following code for bugs, security issues, and style violations.

Code:
\`\`\`{{language}}
{{code_snippet}}
\`\`\`

Context: {{review_context}}

Analyze for:
- Logic errors
- Null/undefined handling
- Security vulnerabilities
- Performance issues
- Style violations against {{style_guide}}`,
    variables: ["language", "code_snippet", "review_context", "style_guide"],
    evaluations: [
      { id: "eval-5", experimentName: "v2 Current", score: 93.8, date: "2026-07-21", metrics: [{ name: "Bug Detection", value: 91 }, { name: "Precision", value: 89 }, { name: "Recall", value: 94 }] },
      { id: "eval-6", experimentName: "v2 with Ctx", score: 95.2, date: "2026-07-21", metrics: [{ name: "Bug Detection", value: 93 }, { name: "Precision", value: 91 }, { name: "Recall", value: 96 }] },
    ],
  },
];

// ---- Mock Experiments ----

export const mockExperiments: Experiment[] = [
  { id: "exp-1", name: "v3 Baseline Eval", projectId: "proj-1", promptId: "p-1", status: "completed", score: 92.5, createdAt: "2026-07-20" },
  { id: "exp-2", name: "Few-shot Experiment", projectId: "proj-1", promptId: "p-1", status: "completed", score: 89.3, createdAt: "2026-07-19" },
  { id: "exp-3", name: "GPT-4o Comparison", projectId: "proj-1", promptId: "p-1", status: "running", score: null, createdAt: "2026-07-21" },
  { id: "exp-4", name: "Refund Policy Update Test", projectId: "proj-1", promptId: "p-2", status: "pending", score: null, createdAt: "2026-07-21" },
  { id: "exp-5", name: "Code Review Round 3", projectId: "proj-3", promptId: "p-5", status: "running", score: null, createdAt: "2026-07-21" },
];

// ---- Mock Prompt Versions ----

export const mockPromptVersions: Record<string, PromptVersion[]> = {
  "p-1": [
    { version: "v3", content: `You are a customer support triage agent for {{company_name}}.

Classify the following customer inquiry into one of these categories:
- {{category_billing}}
- {{category_technical}}
- {{category_account}}
- {{category_general}}

Customer Inquiry: {{user_message}}

Respond with ONLY the category name and a confidence score (0-100).`, updatedAt: "2026-07-20", score: 92.5, status: "active" },
    { version: "v2", content: `You are a customer support classifier for {{company_name}}.

Classify this inquiry:
{{user_message}}

Categories: {{category_billing}}, {{category_technical}}, {{category_account}}, {{category_general}}

Return: category name only.`, updatedAt: "2026-07-15", score: 88.2, status: "archived" },
    { version: "v1", content: `Classify the customer message into billing, technical, account, or general.

Message: {{user_message}}`, updatedAt: "2026-07-10", score: 81.0, status: "archived" },
  ],
  "p-2": [
    { version: "v2", content: `You are a refund processing agent for {{company_name}}.

Given the following order details, determine if a refund should be issued:
- Order ID: {{order_id}}
- Purchase Date: {{purchase_date}}
- Reason: {{refund_reason}}
- Order Amount: {{order_amount}}

Refund Policy: {{refund_policy}}

Respond with a JSON object: {"eligible": boolean, "amount": number, "reasoning": string}`, updatedAt: "2026-07-19", score: 85.7, status: "active" },
    { version: "v1", content: `Process refund for order {{order_id}}. Reason: {{refund_reason}}.`, updatedAt: "2026-07-12", score: 79.4, status: "archived" },
  ],
  "p-3": [
    { version: "v1", content: `Analyze the conversation history and determine if escalation to a human agent is needed.

Conversation:
{{conversation_history}}

Escalation triggers:
- {{trigger_list}}

Return: {"escalate": boolean, "urgency": "low" | "medium" | "high", "summary": string}`, updatedAt: "2026-07-17", score: null, status: "draft" },
  ],
  "p-4": [
    { version: "v4", content: `Summarize the following article in {{target_length}} words...`, updatedAt: "2026-07-18", score: 88.1, status: "active" },
    { version: "v3", content: `Summary of article ({{target_length}} words): {{article_content}}`, updatedAt: "2026-07-14", score: 86.3, status: "archived" },
  ],
  "p-5": [
    { version: "v2", content: `You are a code review assistant specializing in {{language}}...`, updatedAt: "2026-07-21", score: 93.8, status: "active" },
    { version: "v1", content: `Review this {{language}} code for bugs: {{code_snippet}}`, updatedAt: "2026-07-16", score: 89.5, status: "archived" },
  ],
};

// ---- 30-Day Score Chart Data ----

export function generateScoreData(days: number = 30): { date: string; score: number }[] {
  const data: { date: string; score: number }[] = [];
  const now = new Date();
  let score = 80 + Math.random() * 10;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    score = Math.max(60, Math.min(100, score + (Math.random() - 0.4) * 6));
    data.push({ date: d.toISOString().slice(0, 10), score: Math.round(score * 10) / 10 });
  }
  return data;
}

// ---- Helpers ----

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}

export function getPromptsByProject(projectId: string): Prompt[] {
  return mockPrompts.filter((p) => p.projectId === projectId);
}

export function getPromptById(id: string): Prompt | undefined {
  return mockPrompts.find((p) => p.id === id);
}

export function getExperimentsByProject(projectId: string): Experiment[] {
  return mockExperiments.filter((e) => e.projectId === projectId);
}

export function getExperimentsByPrompt(promptId: string): Experiment[] {
  return mockExperiments.filter((e) => e.promptId === promptId);
}
