## Why

The existing Pipeline-Kanban bridge only triggers when an opportunity reaches "won" — too late for operational tracking. Teams need Kanban tasks created at the "proposal" stage so work can begin before the deal closes. Additionally, the current bridge is one-directional (pipeline→kanban creates tasks, kanban→pipeline only updates a progress percentage). There is no stage/status synchronization: when a pipeline stage changes, linked Kanban tasks don't update, and when all linked Kanban tasks are completed, the pipeline stage doesn't advance.

## What Changes

- **Auto-create Kanban tasks at "proposal" stage** (not just "won"): When an opportunity moves to the "proposal" stage, auto-generate a structured set of Kanban tasks (research, proposal drafting, review, delivery). These replace/extend the current "won-only" task creation.
- **Pipeline stage → Kanban task status mapping**: When an opportunity stage changes, update the status of linked Kanban tasks based on a configurable stage→status mapping (e.g., "lost" → archive tasks, "won" → move tasks to in_progress).
- **Kanban task completion → Pipeline stage update**: When all linked Kanban tasks reach "done", automatically advance the opportunity to the next logical stage (e.g., "proposal" → "negotiation").
- **Bidirectional sync API**: Extend the existing `/api/pipeline/kanban-bridge` endpoint to support a full two-way sync action that reconciles both directions in a single call.
- **Sync event logging**: All sync operations logged to the activity journal for audit trail.

## Capabilities

### New Capabilities
- `proposal-stage-tasks`: Auto-create Kanban tasks when opportunity enters "proposal" stage, with configurable templates per service type
- `stage-status-sync`: Bidirectional mapping between pipeline stages and Kanban task statuses, with automatic propagation on change
- `reverse-sync`: Kanban task completion triggers pipeline stage advancement (all tasks done → stage advances)

### Modified Capabilities
<!-- No existing specs found in openspec/specs/ -->

## Impact

- **`src/lib/pipeline-kanban-bridge.ts`**: Major extension — new template set for proposal stage, stage↔status mapping table, reverse sync logic
- **`src/lib/pipeline-db.ts`**: Update `updateOpportunity()` bridge hook to trigger on "proposal" stage (not just "won"), add stage advancement from Kanban
- **`src/lib/kanban-db.ts`**: Update `updateTask()` bridge hook to check for stage advancement on task completion
- **`src/app/api/pipeline/kanban-bridge/route.ts`**: Add "full-sync" action for bidirectional reconciliation
- **`src/app/api/kanban/tasks/[id]/move/route.ts`**: Extend move handler with stage advancement check
- **Database**: No schema changes — uses existing `opportunities` and `kanban_tasks` tables with the `[Opportunity: Company]` text convention
