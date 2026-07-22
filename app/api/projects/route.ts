import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProjects, getPrompts, createProject, ensureSeed } from '@/lib/db/store';

const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
});

// GET /api/projects — list all projects with prompt counts
export async function GET() {
  ensureSeed();
  try {
    const projects = getProjects();
    const result = projects.map((p) => ({
      ...p,
      promptCount: getPrompts(p.id).length,
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects — create a project
export async function POST(request: NextRequest) {
  ensureSeed();
  try {
    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const project = createProject(parsed.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
