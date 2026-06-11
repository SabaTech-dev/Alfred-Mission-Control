import { NextRequest, NextResponse } from "next/server";
import { listProjects, listTasks, getColumns, createProject, updateProject, deleteProject } from "@/lib/kanban-db";

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
 * GET /api/projects — List all projects with stats
 */
export async function GET() {
  try {
    const projects = listProjects();
    return NextResponse.json({ projects: attachStats(projects) });
  } catch (error) {
    console.error("Failed to get projects:", error);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

/**
 * POST /api/projects — Create a new project
 * Body: { name, description?, missionAlignment?, status?, milestones? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = createProject({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      missionAlignment: body.missionAlignment?.trim() || null,
      status: body.status || "active",
      milestones: body.milestones || [],
    });

    return NextResponse.json({ project: attachStats([project])[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
