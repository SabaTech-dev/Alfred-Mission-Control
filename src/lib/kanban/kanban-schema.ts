/**
 * Kanban Schema Initialization & Migrations
 * Creates tables, runs idempotent migrations, and seeds default data.
 */

import type Database from "@/lib/sqlite-wrapper";

/**
 * Initialize database schema and run all migrations.
 * Called once by getDb() when the singleton is first created.
 */
export function initSchema(db: Database): void {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      "order" REAL NOT NULL DEFAULT 0,
      "limit" INTEGER
    );

    CREATE TABLE IF NOT EXISTS kanban_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee TEXT,
      labels TEXT,
      "order" REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_kanban_tasks_status ON kanban_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_kanban_tasks_priority ON kanban_tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_kanban_tasks_order ON kanban_tasks("order");
    CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assignee ON kanban_tasks(assignee);
    CREATE INDEX IF NOT EXISTS idx_kanban_columns_order ON kanban_columns("order");

    -- Mission Control Tables (idempotent migration)

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mission_alignment TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      milestones TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_identities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      personality TEXT,
      avatar TEXT,
      mission TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS operations_journal (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      narrative TEXT NOT NULL,
      highlights TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_operations_journal_date ON operations_journal(date);
  `);

  // Idempotent migration: Add project_id column to kanban_tasks
  const projectColumnExists = db
    .prepare("SELECT 1 FROM pragma_table_info('kanban_tasks') WHERE name = 'project_id'")
    .get() as { "1": number } | undefined;

  if (!projectColumnExists) {
    db.exec(`
      ALTER TABLE kanban_tasks ADD COLUMN project_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_kanban_tasks_project_id ON kanban_tasks(project_id);
    `);
    console.log("[kanban-db] Added project_id column to kanban_tasks");
  }

  // Idempotent migration: Add new task fields for dependencies and execution
  const migrations = [
    { name: "due_date", sql: "ALTER TABLE kanban_tasks ADD COLUMN due_date TEXT" },
    { name: "depends_on", sql: "ALTER TABLE kanban_tasks ADD COLUMN depends_on TEXT" },
    { name: "execution_status", sql: "ALTER TABLE kanban_tasks ADD COLUMN execution_status TEXT" },
    { name: "execution_result", sql: "ALTER TABLE kanban_tasks ADD COLUMN execution_result TEXT" },
    { name: "blocked_by", sql: "ALTER TABLE kanban_tasks ADD COLUMN blocked_by TEXT" },
    { name: "waiting_for", sql: "ALTER TABLE kanban_tasks ADD COLUMN waiting_for TEXT" },
    { name: "claimed_by", sql: "ALTER TABLE kanban_tasks ADD COLUMN claimed_by TEXT" },
    { name: "claimed_at", sql: "ALTER TABLE kanban_tasks ADD COLUMN claimed_at TEXT" },
    { name: "created_by", sql: "ALTER TABLE kanban_tasks ADD COLUMN created_by TEXT" },
  ];

  for (const migration of migrations) {
    const columnExists = db
      .prepare("SELECT 1 FROM pragma_table_info('kanban_tasks') WHERE name = ?")
      .get(migration.name) as { "1": number } | undefined;

    if (!columnExists) {
      try {
        db.exec(migration.sql);
        console.log(`[kanban-db] Added ${migration.name} column to kanban_tasks`);
      } catch {
        // Column may already exist from a previous partial migration
      }
    }
  }

  // Idempotent migration: Add index for claimed_by
  db.exec(`CREATE INDEX IF NOT EXISTS idx_kanban_tasks_claimed_by ON kanban_tasks(claimed_by)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_kanban_tasks_created_by ON kanban_tasks(created_by)`);

  // Idempotent migration: Add domain column
  const domainColumnExists = db
    .prepare("SELECT 1 FROM pragma_table_info('kanban_tasks') WHERE name = 'domain'")
    .get() as { "1": number } | undefined;

  if (!domainColumnExists) {
    db.exec(`ALTER TABLE kanban_tasks ADD COLUMN domain TEXT`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_kanban_tasks_domain ON kanban_tasks(domain)`);
    console.log("[kanban-db] Added domain column to kanban_tasks");
  }

  // Idempotent migration: Add task_comments table
  const commentsTableExists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='task_comments'")
    .get() as { "1": number } | undefined;

  if (!commentsTableExists) {
    db.exec(`
      CREATE TABLE task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        author_type TEXT NOT NULL DEFAULT 'human',
        author_id TEXT,
        body TEXT NOT NULL,
        comment_type TEXT NOT NULL DEFAULT 'comment',
        status_from TEXT,
        status_to TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        agent_id TEXT,
        content TEXT
      );
    `);
    console.log("[kanban-db] Created task_comments table");
  }

  const commentMigrations = [
    { name: "author_type", sql: "ALTER TABLE task_comments ADD COLUMN author_type TEXT" },
    { name: "author_id", sql: "ALTER TABLE task_comments ADD COLUMN author_id TEXT" },
    { name: "body", sql: "ALTER TABLE task_comments ADD COLUMN body TEXT" },
    { name: "comment_type", sql: "ALTER TABLE task_comments ADD COLUMN comment_type TEXT" },
    { name: "status_from", sql: "ALTER TABLE task_comments ADD COLUMN status_from TEXT" },
    { name: "status_to", sql: "ALTER TABLE task_comments ADD COLUMN status_to TEXT" },
    { name: "metadata", sql: "ALTER TABLE task_comments ADD COLUMN metadata TEXT" },
    { name: "agent_id", sql: "ALTER TABLE task_comments ADD COLUMN agent_id TEXT" },
    { name: "content", sql: "ALTER TABLE task_comments ADD COLUMN content TEXT" },
  ];

  for (const migration of commentMigrations) {
    const columnExists = db
      .prepare("SELECT 1 FROM pragma_table_info('task_comments') WHERE name = ?")
      .get(migration.name) as { "1": number } | undefined;

    if (!columnExists) {
      try {
        db.exec(migration.sql);
        console.log(`[kanban-db] Added ${migration.name} column to task_comments`);
      } catch {
        // Column may already exist
      }
    }
  }

  db.exec(`
    UPDATE task_comments
    SET
      author_type = COALESCE(NULLIF(author_type, ''), CASE WHEN agent_id IS NOT NULL AND TRIM(agent_id) != '' THEN 'agent' ELSE 'human' END),
      author_id = COALESCE(NULLIF(author_id, ''), NULLIF(agent_id, '')),
      body = COALESCE(NULLIF(body, ''), NULLIF(content, '')),
      comment_type = COALESCE(NULLIF(comment_type, ''), 'comment'),
      updated_at = COALESCE(NULLIF(updated_at, ''), created_at)
    WHERE
      author_type IS NULL OR author_type = '' OR
      body IS NULL OR body = '' OR
      comment_type IS NULL OR comment_type = '' OR
      updated_at IS NULL OR updated_at = ''
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_comments_agent_id ON task_comments(agent_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON task_comments(task_id, created_at DESC, id DESC)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task_comments(author_type, author_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_comments_type ON task_comments(comment_type)`);

  // Idempotent migration: Add archive fields
  const archiveMigrations = [
    { name: "archived", sql: "ALTER TABLE kanban_tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0" },
    { name: "archived_at", sql: "ALTER TABLE kanban_tasks ADD COLUMN archived_at TEXT" },
    { name: "done_at", sql: "ALTER TABLE kanban_tasks ADD COLUMN done_at TEXT" },
  ];

  for (const migration of archiveMigrations) {
    const columnExists = db
      .prepare("SELECT 1 FROM pragma_table_info('kanban_tasks') WHERE name = ?")
      .get(migration.name) as { "1": number } | undefined;

    if (!columnExists) {
      try {
        db.exec(migration.sql);
        console.log(`[kanban-db] Added ${migration.name} column to kanban_tasks`);
      } catch {
        // Column may already exist
      }
    }
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_kanban_tasks_archive ON kanban_tasks(archived, status, done_at)`);

  // Backfill: Set done_at for existing done tasks
  db.exec(`
    UPDATE kanban_tasks
    SET done_at = updated_at
    WHERE status = 'done' AND done_at IS NULL
  `);

  // Seed default columns if table is empty
  const columnCount = (db.prepare("SELECT COUNT(*) as n FROM kanban_columns").get() as { n: number }).n;
  if (columnCount === 0) {
    const defaultColumns = [
      { id: "backlog", name: "Backlog", color: "#6b7280", order: 0, limit: null },
      { id: "in_progress", name: "In Progress", color: "#3b82f6", order: 1, limit: null },
      { id: "review", name: "Review", color: "#f59e0b", order: 2, limit: null },
      { id: "done", name: "Done", color: "#22c55e", order: 3, limit: null },
      { id: "blocked", name: "Blocked", color: "#ef4444", order: 4, limit: null },
      { id: "waiting", name: "Waiting", color: "#a855f7", order: 5, limit: null },
    ];

    const insertColumn = db.prepare(`
      INSERT INTO kanban_columns (id, name, color, "order", "limit")
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((columns: typeof defaultColumns) => {
      for (const col of columns) {
        insertColumn.run(col.id, col.name, col.color, col.order, col.limit);
      }
    });

    insertMany(defaultColumns);
    console.log("[kanban-db] Seeded default columns including blocked/waiting");
  }
}
