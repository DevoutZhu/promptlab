// Seed script: populate database with demo data
import { db, migrate } from '../lib/db/index.js';
import { projects, prompts, experiments, evaluations } from '../lib/db/schema.js';

migrate();

// Clean existing data
db.delete(evaluations).run();
db.delete(experiments).run();
db.delete(prompts).run();
db.delete(projects).run();

// Create projects
const proj1 = db.insert(projects).values({
  name: 'Customer Support Bot',
  description: 'System and user prompts for customer support chatbot',
}).returning().get();

const proj2 = db.insert(projects).values({
  name: 'Content Generator',
  description: 'Prompts for blog and social media content generation',
}).returning().get();

const proj3 = db.insert(projects).values({
  name: 'Code Assistant',
  description: 'Prompts for AI coding assistant tools',
}).returning().get();

// Create prompts for project 1
const p1 = db.insert(prompts).values({
  projectId: proj1.id,
  name: 'system-prompt',
  content: 'You are a helpful customer support agent for {{company_name}}. Be {{tone}} and professional. Always greet the customer by name: {{customer_name}}.',
  variables: JSON.stringify(['company_name', 'tone', 'customer_name']),
  version: 1,
}).returning().get();

const p2 = db.insert(prompts).values({
  projectId: proj1.id,
  name: 'greeting-prompt',
  content: 'Hello {{customer_name}}, thank you for reaching {{company_name}} support. How can I help you today?',
  variables: JSON.stringify(['company_name', 'customer_name']),
  version: 1,
}).returning().get();

// Version 2 of system-prompt
const p1v2 = db.insert(prompts).values({
  projectId: proj1.id,
  name: 'system-prompt',
  content: 'You are a {{tone}} customer support agent for {{company_name}}. Greet {{customer_name}} warmly. Keep responses under 150 words. Suggest relevant help articles when possible.',
  variables: JSON.stringify(['company_name', 'tone', 'customer_name']),
  version: 2,
}).returning().get();

// Create an experiment
const exp = db.insert(experiments).values({
  promptId: p1.id,
  name: 'Tone optimization',
  baselineVersion: 1,
  candidateVersion: 2,
  status: 'completed',
  results: JSON.stringify({
    baselineScore: 72.5,
    candidateScore: 89.3,
    winner: 'candidate',
    improvement: '+16.8%',
    totalTests: 100,
  }),
}).returning().get();

// Create evaluations
const metrics = JSON.stringify({ helpfulness: 0.9, conciseness: 0.85, accuracy: 0.95 });
db.insert(evaluations).values({ experimentId: exp.id, score: 89.3, metrics }).run();
db.insert(evaluations).values({ experimentId: exp.id, score: 87.1, metrics }).run();
db.insert(evaluations).values({ experimentId: exp.id, score: 91.5, metrics }).run();

// Create prompts for project 2
db.insert(prompts).values({
  projectId: proj2.id,
  name: 'blog-outline',
  content: 'Write a blog post outline about {{topic}}. Target audience: {{audience}}. Tone: {{tone}}.',
  variables: JSON.stringify(['topic', 'audience', 'tone']),
  version: 1,
}).run();

db.insert(prompts).values({
  projectId: proj2.id,
  name: 'social-post',
  content: 'Create a {{platform}} post about {{topic}}. Max {{max_length}} characters. Include hashtags.',
  variables: JSON.stringify(['platform', 'topic', 'max_length']),
  version: 1,
}).run();

// Create prompts for project 3
db.insert(prompts).values({
  projectId: proj3.id,
  name: 'code-review',
  content: 'Review the following {{language}} code for bugs and suggest improvements:\\n```\\n{{code}}\\n```',
  variables: JSON.stringify(['language', 'code']),
  version: 1,
}).run();

console.log('✅ Seed complete!');
console.log(`   Projects: ${db.select().from(projects).all().length}`);
console.log(`   Prompts: ${db.select().from(prompts).all().length}`);
console.log(`   Experiments: ${db.select().from(experiments).all().length}`);
console.log(`   Evaluations: ${db.select().from(evaluations).all().length}`);
process.exit(0);
