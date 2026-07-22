// JSON-file database — zero deps, survives page refresh, no native compilation needed
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = process.env.VERCEL
  ? path.join('/tmp', 'data.json')
  : path.join(process.cwd(), 'data.json');

interface DB {
  projects: Project[];
  prompts: Prompt[];
  experiments: Experiment[];
  evaluations: Evaluation[];
}

interface Project {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

interface Prompt {
  id: number;
  projectId: number;
  name: string;
  content: string;
  variables: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface Experiment {
  id: number;
  promptId: number;
  name: string;
  baselineVersion: number;
  candidateVersion: number;
  status: 'draft' | 'running' | 'completed';
  results: string | null;
  createdAt: string;
}

interface Evaluation {
  id: number;
  experimentId: number;
  score: number;
  metrics: string;
  createdAt: string;
}

function read(): DB {
  if (!fs.existsSync(DATA_FILE)) return { projects: [], prompts: [], experiments: [], evaluations: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function write(db: DB): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

let nextId = (arr: { id: number }[]) => arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;

// Projects
export function getProjects(): Project[] { return read().projects; }
export function getProject(id: number): Project | undefined { return read().projects.find(p => p.id === id); }
export function createProject(data: { name: string; description?: string }): Project {
  const db = read();
  const project: Project = { id: nextId(db.projects), name: data.name, description: data.description ?? '', createdAt: new Date().toISOString() };
  db.projects.push(project); write(db); return project;
}
export function deleteProject(id: number): boolean {
  const db = read();
  const idx = db.projects.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.projects.splice(idx, 1);
  db.prompts = db.prompts.filter(p => p.projectId !== id);
  write(db); return true;
}

// Prompts
export function getPrompts(projectId: number): Prompt[] {
  return read().prompts.filter(p => p.projectId === projectId);
}
export function getPrompt(id: number): Prompt | undefined {
  return read().prompts.find(p => p.id === id);
}
export function createPrompt(data: { projectId: number; name: string; content: string; variables?: string[] }): Prompt {
  const db = read();
  const prompt: Prompt = {
    id: nextId(db.prompts), projectId: data.projectId, name: data.name,
    content: data.content, variables: JSON.stringify(data.variables ?? []), version: 1,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  db.prompts.push(prompt); write(db); return prompt;
}
export function updatePrompt(id: number, content: string): Prompt | null {
  const db = read();
  const latest = db.prompts.filter(p => p.id === id || (p.name === db.prompts.find(x => x.id === id)?.name && p.projectId === db.prompts.find(x => x.id === id)?.projectId)).sort((a, b) => b.version - a.version);
  const base = db.prompts.find(p => p.id === id);
  if (!base) return null;
  const newVersion: Prompt = {
    id: nextId(db.prompts), projectId: base.projectId, name: base.name,
    content, variables: base.variables, version: (latest[0]?.version ?? 0) + 1,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  db.prompts.push(newVersion); write(db); return newVersion;
}
export function getVersionHistory(promptId: number): Prompt[] {
  const prompt = read().prompts.find(p => p.id === promptId);
  if (!prompt) return [];
  return read().prompts.filter(p => p.projectId === prompt.projectId && p.name === prompt.name).sort((a, b) => b.version - a.version);
}

// Experiments
export function getExperiment(id: number): Experiment | undefined {
  return read().experiments.find(e => e.id === id);
}
export function getExperiments(promptId?: number): Experiment[] {
  const exps = read().experiments;
  return promptId ? exps.filter(e => e.promptId === promptId) : exps;
}
export function createExperiment(data: { promptId: number; name: string; baselineVersion: number; candidateVersion: number }): Experiment {
  const db = read();
  const exp: Experiment = {
    id: nextId(db.experiments), promptId: data.promptId, name: data.name,
    baselineVersion: data.baselineVersion, candidateVersion: data.candidateVersion,
    status: 'draft', results: null, createdAt: new Date().toISOString(),
  };
  db.experiments.push(exp); write(db); return exp;
}
export function updateExperiment(id: number, status: Experiment['status'], results?: string): Experiment | null {
  const db = read();
  const exp = db.experiments.find(e => e.id === id);
  if (!exp) return null;
  exp.status = status;
  if (results) exp.results = results;
  write(db); return exp;
}

// Evaluations
export function getEvaluations(experimentId: number): Evaluation[] {
  return read().evaluations.filter(e => e.experimentId === experimentId);
}
export function createEvaluation(data: { experimentId: number; score: number; metrics?: Record<string, number> }): Evaluation {
  const db = read();
  const ev: Evaluation = {
    id: nextId(db.evaluations), experimentId: data.experimentId,
    score: data.score, metrics: JSON.stringify(data.metrics ?? {}), createdAt: new Date().toISOString(),
  };
  db.evaluations.push(ev); write(db); return ev;
}

// Seed data on first run
export function ensureSeed(): void {
  const db = read();
  if (db.projects.length > 0) return;

  const proj = createProject({ name: 'Customer Support Bot', description: 'System prompts for customer support chatbot' });
  const proj2 = createProject({ name: 'Content Generator', description: 'Prompts for blog and social media generation' });
  const proj3 = createProject({ name: 'Code Assistant', description: 'AI coding assistant prompt library' });

  createPrompt({ projectId: proj.id, name: 'system-prompt', content: 'You are a helpful customer support agent for {{company_name}}. Be {{tone}} and professional. Greet {{customer_name}} by name.', variables: ['company_name', 'tone', 'customer_name'] });
  createPrompt({ projectId: proj.id, name: 'greeting-prompt', content: 'Hello {{customer_name}}, welcome to {{company_name}} support. How can I help?', variables: ['company_name', 'customer_name'] });
  createPrompt({ projectId: proj2.id, name: 'blog-outline', content: 'Write a blog outline about {{topic}}. Audience: {{audience}}. Tone: {{tone}}.', variables: ['topic', 'audience', 'tone'] });
  createPrompt({ projectId: proj2.id, name: 'social-post', content: 'Create a {{platform}} post about {{topic}}. Max {{max_length}} chars.', variables: ['platform', 'topic', 'max_length'] });
  createPrompt({ projectId: proj3.id, name: 'code-review', content: 'Review this {{language}} code for bugs:\\n```\\n{{code}}\\n```', variables: ['language', 'code'] });

  const p1 = getPrompts(proj.id)[0];
  updatePrompt(p1.id, 'You are a {{tone}} customer support agent for {{company_name}}. Greet {{customer_name}}. Keep under 150 words. Suggest help articles.');
  const exp = createExperiment({ promptId: p1.id, name: 'Tone optimization', baselineVersion: 1, candidateVersion: 2 });
  updateExperiment(exp.id, 'completed', JSON.stringify({ baselineScore: 72.5, candidateScore: 89.3, winner: 'candidate', improvement: '+16.8%' }));
  createEvaluation({ experimentId: exp.id, score: 89.3 });
  createEvaluation({ experimentId: exp.id, score: 87.1 });

  console.log('✅ Seed data created');
}

// Seed data creation is handled by API routes on first request
