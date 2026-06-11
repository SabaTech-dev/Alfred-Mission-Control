import { NextRequest, NextResponse } from "next/server";
import { listProjects, listTasks, getColumns, getProject, updateProject, deleteProject } from "@/lib/kanban-db";

export const dynamic = "force-dynamic";

interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  missionAlignment: string | null;
  status: string;
  milestones: unknown[];
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  progress: number;
}

function attachStats(projects: ReturnType<typeof listProjects>): ProjectWithStats[] {
  const tasks = listTasks();
  const columns = getColumns();
  const doneColumn = columns.find(
    (col) => col.name.toLowerCase() === "done" || col.name.toLowerCase() === "completed"
  );

  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const taskCount = projectTasks.length;
    let progress = 0;
    if (taskCount > 0 && doneColumn) {
      const doneTasks = projectTasks.filter((task) => task.status === doneColumn.id);
      progress = Math.round((doneTasks.length / taskCount) * 100);
    }
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      missionAlignment: project.missionAlignment,
      status: project.status,
      milestones: project.milestones,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount,
      progress,
    };
  });
}

/**
 * GET /api/projects/[id] — Get single project with stats
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project: attachStats([project])[0] });
  } catch (error) {
    console.error("Failed to get project:", error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id] — Update a project
 * Body: { name?, description?, missionAlignment?, status?, milestones? }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.missionAlignment !== undefined) updates.missionAlignment = body.missionAlignment?.trim() || null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.milestones !== undefined) updates.milestones = body.milestones;

    const project = updateProject(id, updates as Parameters<typeof updateProject>[1]);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project: attachStats([project])[0] });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id] — Delete a project (orphans its tasks)
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = deleteProject(id);
    if (!result.deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, orphanedTasks: result.orphanedTasks });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
