CREATE TABLE kanban_columns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      "order" REAL NOT NULL DEFAULT 0,
      "limit" INTEGER
    );
CREATE TABLE kanban_tasks (
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
    , project_id TEXT, due_date TEXT, depends_on TEXT, execution_status TEXT, execution_result TEXT, blocked_by TEXT, waiting_for TEXT, claimed_by TEXT, claimed_at TEXT, created_by TEXT, domain TEXT, archived INTEGER NOT NULL DEFAULT 0, archived_at TEXT, done_at TEXT);
CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mission_alignment TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      milestones TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
CREATE TABLE agent_identities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      personality TEXT,
      avatar TEXT,
      mission TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
CREATE TABLE operations_journal (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      narrative TEXT NOT NULL,
      highlights TEXT,
      created_at TEXT NOT NULL
    );
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
CREATE TABLE opportunities (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      contact_linkedin TEXT,
      title TEXT NOT NULL,
      description TEXT,
      stage TEXT NOT NULL DEFAULT 'lead',
      value REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      service_type TEXT NOT NULL DEFAULT 'other',
      probability REAL,
      source TEXT,
      next_action TEXT,
      next_action_date TEXT,
      notes TEXT,
      progress REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT
    , source_type TEXT NOT NULL DEFAULT 'auto_sync');
CREATE TABLE lost_and_found(rootpgno INTEGER, pgno INTEGER, nfield INTEGER, id INTEGER, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20);
CREATE INDEX idx_kanban_tasks_status ON kanban_tasks(status);
CREATE INDEX idx_kanban_tasks_priority ON kanban_tasks(priority);
CREATE INDEX idx_kanban_tasks_order ON kanban_tasks("order");
CREATE INDEX idx_kanban_tasks_assignee ON kanban_tasks(assignee);
CREATE INDEX idx_kanban_columns_order ON kanban_columns("order");
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_operations_journal_date ON operations_journal(date);
CREATE INDEX idx_kanban_tasks_project_id ON kanban_tasks(project_id);
CREATE INDEX idx_kanban_tasks_claimed_by ON kanban_tasks(claimed_by);
CREATE INDEX idx_kanban_tasks_created_by ON kanban_tasks(created_by);
CREATE INDEX idx_kanban_tasks_domain ON kanban_tasks(domain);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_agent_id ON task_comments(agent_id);
CREATE INDEX idx_task_comments_task_created ON task_comments(task_id, created_at DESC, id DESC);
CREATE INDEX idx_task_comments_author ON task_comments(author_type, author_id);
CREATE INDEX idx_task_comments_type ON task_comments(comment_type);
CREATE INDEX idx_kanban_tasks_archive ON kanban_tasks(archived, status, done_at);
