# Spec: kanban-db.ts Split

## Requirements
- Split `src/lib/kanban-db.ts` (2240 lines) into domain-specific modules
- Each module under 300 lines
- Shared `getDb()` function remains in main file
- All existing exports preserved via re-exports
- No API contract changes

## Scenarios

### Scenario 1: kanban-schema.ts
- **Given** the kanban-db.ts file contains CREATE TABLE and migration code
- **When** extracting to kanban-schema.ts
- **Then** all schema initialization functions are exported and re-exported from kanban-db.ts

### Scenario 2: kanban-tasks.ts
- **Given** the kanban-db.ts file contains task CRUD operations
- **When** extracting to kanban-tasks.ts
- **Then** all task functions (create, read, update, delete, status changes, claiming) are available

### Scenario 3: kanban-columns.ts
- **Given** the kanban-db.ts file contains column operations
- **When** extracting to kanban-columns.ts
- **Then** all column CRUD and reordering functions are available

### Scenario 4: kanban-labels.ts
- **Given** the kanban-db.ts file contains label operations
- **When** extracting to kanban-labels.ts
- **Then** all label CRUD functions are available

### Scenario 5: kanban-metrics.ts
- **Given** the kanban-db.ts file contains stats/metrics queries
- **When** extracting to kanban-metrics.ts
- **Then** all stats, metrics, and agent query functions are available

### Scenario 6: Backward compatibility
- **Given** existing imports like `import { X } from "@/lib/kanban-db"`
- **When** the split is complete
- **Then** all imports continue to work without changes
