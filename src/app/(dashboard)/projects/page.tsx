import { listProjects, listTasks, getColumns } from "@/lib/kanban-db";
import ProjectsClient, { ProjectsInitialData } from "./ProjectsClient";

export const dynamic = "force-dynamic";

async function getProjectsInitialData(): Promise<ProjectsInitialData> {
  const projects = listProjects();
  const tasks = listTasks();
  const columns = getColumns();

  // Find "done" column to calculate progress
  const doneColumn = columns.find(
    (col) => col.name.toLowerCase() === "done" || col.name.toLowerCase() === "completed"
  );

  // Calculate taskCount and progress for each project
  const projectsWithStats = projects.map((project) => {
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

  return {
    projects: projectsWithStats,
  };
}

export default async function ProjectsPage() {
  const initialData = await getProjectsInitialData();
  return <ProjectsClient initialData={initialData} />;
}
