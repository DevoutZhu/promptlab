import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums & Constrained String Types
// ---------------------------------------------------------------------------

export const EXPERIMENT_STATUSES = ["draft", "running", "completed"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Zod Validation Schemas
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
});

export const promptSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  content: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

export const updatePromptSchema = z.object({
  content: z.string().min(1),
});

export const experimentSchema = z.object({
  promptId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  baselineVersion: z.number().int().positive(),
  candidateVersion: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// TypeScript Interfaces (plain TS types decoupled from Drizzle)
// ---------------------------------------------------------------------------

export interface Project {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Prompt {
  id: number;
  projectId: number;
  name: string;
  content: string;
  variables: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: number;
  promptId: number;
  name: string;
  baselineVersion: number;
  candidateVersion: number;
  status: ExperimentStatus;
  results: ExperimentResults | null;
  createdAt: string;
}

export interface ExperimentResults {
  baselineScore: number;
  candidateScore: number;
  winner: "baseline" | "candidate" | "tie";
  comparisons: ComparisonItem[];
}

export interface ComparisonItem {
  metric: string;
  baseline: number;
  candidate: number;
  difference: number;
}

export interface Evaluation {
  id: number;
  experimentId: number;
  score: number;
  metrics: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Insert / Create Types (no auto-generated fields)
// ---------------------------------------------------------------------------

export type NewProject = Omit<Project, "id" | "createdAt">;

export type NewPrompt = Omit<Prompt, "id" | "version" | "createdAt" | "updatedAt">;

export type NewExperiment = Omit<Experiment, "id" | "status" | "results" | "createdAt">;
