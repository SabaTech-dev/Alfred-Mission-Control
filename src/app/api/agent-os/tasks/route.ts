/**
 * Agent OS: Task Pipeline API
 * GET /api/agent-os/tasks — List tasks across all workspaces with pipeline stages
 * Query: ?stage=todo|in_progress|security|qa|review|done&agent=xxx
 */
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { execSync } from "child_process";
import Database from "@/lib/sqlite-wrapper";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || "/home/joker/.openclaw";

export type PipelineStage = "backlog" | "in_progress" | "security" | "qa" | "review" | "done";

export interface PipelineTask {
  id: string;
  title: string;
  description: string;
  stage: PipelineStage;
  agent: string;
  priority: "P0" | "P1" | "P2" | "P3";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  workboardRef?: string;
  progress: number; // 0-100
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  backlog: "Backlog",
  in_progress: "In Progress",
  security: "Security Review",
  qa: "QA Testing",
  review: "Review",
  done: "Done",
};

const STAGE_ORDER: PipelineStage[] = ["backlog", "in_progress", "security", "qa", "review", "done"];

function parseTasksFromMarkdown(content: string, agent: string): PipelineTask[] {
  const tasks: PipelineTask[] = [];
  const lines = content.split("\n");

  let currentStage: PipelineStage = "backlog";
  let taskIndex = 0;

  for (const line of lines) {
    // Detect stage headers
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("backlog") || lowerLine.includes("pending")) {
      currentStage = "backlog";
      continue;
    }
    if (lowerLine.includes("progress") || lowerLine.includes("working") || lowerLine.includes("active")) {
      currentStage = "in_progress";
      continue;
    }
    if (lowerLine.includes("security") || lowerLine.includes("sec review")) {
      currentStage = "security";
      continue;
    }
    if (lowerLine.includes("qa") || lowerLine.includes("test") || lowerLine.includes("quality")) {
      currentStage = "qa";
      continue;
    }
    if (lowerLine.includes("review") || lowerLine.includes("alfred review")) {
      currentStage = "review";
      continue;
    }
    if (lowerLine.includes("done") || lowerLine.includes("completed") || lowerLine.includes("finished")) {
      currentStage = "done";
      continue;
    }

    // Parse task lines: - [ ] or - [x] or * [x] etc.
    const taskMatch = line.match(/^[\s]*[-*]\s*\[([ xX])\]\s*(.+)/);
    if (taskMatch) {
      const checked = taskMatch[1].toLowerCase() === "x";
      const title = taskMatch[2].trim();
      const id = `${agent}-task-${taskIndex++}`;

      // Extract priority from text
      let priority: PipelineTask["priority"] = "P2";
      if (title.match(/P0|🔴|critical|urgent/i)) priority = "P0";
      else if (title.match(/P1|🟠|high/i)) priority = "P1";
      else if (title.match(/P3|🟢|low|nice/i)) priority = "P3";

      // Extract tags
      const tags: string[] = [];
      const tagMatches = title.matchAll(/#(\w+)/g);
      for (const m of tagMatches) tags.push(m[1]);

      // Clean title from tags and priority markers
      const cleanTitle = title
        .replace(/#\w+/g, "")
        .replace(/P[0-3]/g, "")
        .replace(/🔴|🟠|🟢/g, "")
        .trim();

      tasks.push({
        id,
        title: cleanTitle || title,
        description: "",
        stage: checked ? "done" : currentStage,
        agent,
        priority,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: checked ? 100 : currentStage === "done" ? 100 : undefined,
      });
    }
  }

  // Set progress based on stage
  const stageProgress: Record<PipelineStage, number> = {
    backlog: 0,
    in_progress: 25,
    security: 50,
    qa: 70,
    review: 85,
    done: 100,
  };
  for (const task of tasks) {
    if (task.progress === undefined) {
      task.progress = stageProgress[task.stage];
    }
  }

  return tasks;
}

interface KanbanDb {
  prepare: (sql: string) => {
    all: (...args: unknown[]) => unknown[];
  };
  close: () => void;
}

function getKanbanTasks(): PipelineTask[] {
  try {
    // Try to read from kanban database
    const kanbanData = path.join(process.cwd(), "data", "kanban.db");
    if (!fsSync.existsSync(kanbanData)) return [];

    const db: KanbanDb = new Database(kanbanData, { readonly: true });

    const rows = db
      .prepare(
        `SELECT id, title, description, stage, agent, priority, created_at, updated_at, progress
         FROM tasks
         ORDER BY created_at DESC
         LIMIT 200`
      )
      .all() as Array<{
      id: string;
      title: string;
      description: string;
      stage: string;
      agent: string;
      priority: string;
      created_at: string;
      updated_at: string;
      progress: number;
    }>;

    db.close();

    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      description: r.description || "",
      stage: (r.stage as PipelineStage) || "backlog",
      agent: r.agent || "unknown",
      priority: (r.priority as PipelineTask["priority"]) || "P2",
      tags: [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      workboardRef: String(r.id),
      progress: r.progress ?? 0,
    }));
  } catch {
    return [];
  }
}

function getTasksFromWorkspaces(workspaceDirs: Array<{ path: string; agent: string }>): PipelineTask[] {
  const allTasks: PipelineTask[] = [];

  for (const ws of workspaceDirs) {
    try {
      // Read AGENTS.md or AGENT_TASKS for task lists
      const agentsMd = path.join(ws.path, "AGENTS.md");
      if (!require("fs").existsSync(agentsMd)) continue;

      const content = require("fs").readFileSync(agentsMd, "utf-8");
      const tasks = parseTasksFromMarkdown(content, ws.agent);
      allTasks.push(...tasks);
    } catch {
      // Skip if can't read
    }
  }

  return allTasks;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stageFilter = searchParams.get("stage") || "all";
  const agentFilter = searchParams.get("agent") || "all";

  try {
    // Collect tasks from multiple sources
    let tasks: PipelineTask[] = [];

    // 1. Try kanban database
    const kanbanTasks = getKanbanTasks();
    tasks.push(...kanbanTasks);

    // 2. Scan workspace markdown files
    const workspaces = [
      { path: path.join(OPENCLAW_DIR, "workspace"), agent: "alfred" },
      { path: path.join(OPENCLAW_DIR, "workspace-coder"), agent: "coder" },
      { path: path.join(OPENCLAW_DIR, "workspace-devops"), agent: "devops" },
      { path: path.join(OPENCLAW_DIR, "workspace-qa-tester"), agent: "qa" },
      { path: path.join(OPENCLAW_DIR, "workspace-security"), agent: "security" },
    ];
    const mdTasks = await getTasksFromWorkspacesAsync(workspaces);
    tasks.push(...mdTasks);

    // Deduplicate by title+agent
    const seen = new Set<string>();
    tasks = tasks.filter((t) => {
      const key = `${t.agent}:${t.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Apply filters
    if (stageFilter !== "all") {
      tasks = tasks.filter((t) => t.stage === stageFilter);
    }
    if (agentFilter !== "all") {
      tasks = tasks.filter((t) => t.agent === agentFilter);
    }

    // Sort by priority then updatedAt
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    tasks.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Calculate pipeline stats
    const stats = {
      total: tasks.length,
      byStage: {} as Record<PipelineStage, number>,
      byAgent: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };
    for (const stage of STAGE_ORDER) {
      stats.byStage[stage] = tasks.filter((t) => t.stage === stage).length;
    }
    for (const task of tasks) {
      stats.byAgent[task.agent] = (stats.byAgent[task.agent] || 0) + 1;
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
    }

    return NextResponse.json({
      tasks,
      stats,
      stageLabels: STAGE_LABELS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[agent-os/tasks] Error:", error);
    return NextResponse.json(
      { tasks: [], stats: { total: 0, byStage: {}, byAgent: {}, byPriority: {} }, error: "Failed to load tasks" },
      { status: 500 }
    );
  }
}

async function getTasksFromWorkspacesAsync(
  workspaceDirs: Array<{ path: string; agent: string }>
): Promise<PipelineTask[]> {
  const allTasks: PipelineTask[] = [];

  for (const ws of workspaceDirs) {
    try {
      await fs.access(ws.path);
      const agentsMd = path.join(ws.path, "AGENTS.md");
      try {
        const content = await fs.readFile(agentsMd, "utf-8");
        const tasks = parseTasksFromMarkdown(content, ws.agent);
        allTasks.push(...tasks);
      } catch {
        // Skip
      }
    } catch {
      // Workspace doesn't exist
    }
  }

  return allTasks;
}
