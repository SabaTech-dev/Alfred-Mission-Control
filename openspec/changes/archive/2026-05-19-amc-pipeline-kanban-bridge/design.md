## Context

The Pipeline-Kanban bridge (`src/lib/pipeline-kanban-bridge.ts`) already exists with a one-directional flow: opportunities reaching "won" stage auto-create 3 Kanban tasks, and Kanban task status changes update an opportunity's `progress` field (0-100%). The linking mechanism uses text convention: `[Opportunity: CompanyName]` embedded in task descriptions.

The current architecture has these limitations:
1. Tasks are only created at "won" stage — too late for pre-close work (research, proposal drafting)
2. No stage↔status synchronization — pipeline stage changes don't affect linked Kanban task statuses
3. No reverse stage advancement — completing all Kanban tasks doesn't advance the pipeline stage
4. Progress calculation is only meaningful for "won" opportunities

Both systems share the same SQLite database (`data/kanban.db`) with separate table schemas and separate DB singleton connections.

## Goals / Non-Goals

**Goals:**
- Auto-create Kanban tasks at "proposal" stage (the key user request)
- Propagate pipeline stage changes to linked Kanban task statuses (stage→status mapping)
- Advance pipeline stage when all linked Kanban tasks complete (reverse sync)
- Maintain full backward compatibility with existing "won" stage task creation and progress calculation
- Support a full bidirectional sync action via API

**Non-Goals:**
- Replacing the text-based `[Opportunity: Company]` linking with a junction table (separate change)
- Adding new database tables or schema changes
- Real-time WebSocket/SSE notification of sync events (SSE already exists for kanban)
- Supporting partial sync or selective sync per opportunity

## Decisions

### D1: Trigger task creation at "proposal" stage, keep "won" creation

**Decision**: Extend `shouldCreateTasksForOpportunity()` to trigger at both "proposal" and "won" stages, with different template sets.

**Rationale**: The user explicitly wants auto-creation at "proposal". The existing "won" creation serves post-close delivery tasks. Both are needed — proposal tasks are pre-close work (research, draft, review), won tasks are post-close delivery (setup, implementation, training).

**Templates**:
- "proposal" stage → "Research & preparation", "Draft proposal", "Internal review" (3 tasks, status: backlog)
- "won" stage → existing templates (unchanged)

**Alternatives considered**:
- Only "proposal" stage: Loses post-close delivery tracking
- Configurable trigger stages: Over-engineering for current needs

### D2: Stage-to-status mapping table

**Decision**: Define a `STAGE_STATUS_MAP` constant that maps pipeline stages to Kanban task status changes.

**Mapping**:
```
proposal → no status change (tasks stay as-is, creator manages them)
negotiation → move linked tasks to "in_progress"
won → move linked tasks to "in_progress" (if not already)
lost → archive all linked tasks
lead/contacted/qualifying → no tasks exist, no-op
```

**Rationale**: "lost" means the deal is dead — archive tasks to clean up. "negotiation" and "won" mean active work — move tasks to in_progress. "lead"/"contacted"/"qualifying" stages don't have tasks yet.

**Alternative considered**: Configurable mapping per opportunity — too much complexity for now.

### D3: Reverse sync — all tasks done → advance stage

**Decision**: When all linked Kanban tasks for an opportunity reach "done" status, advance the pipeline stage to the next logical stage:
- If stage is "proposal" → advance to "negotiation"
- If stage is "negotiation" → advance to "won"
- Otherwise → no automatic advancement (manual control for lead→contacted→qualifying)

**Rationale**: This creates a natural flow where completing proposal work moves the deal to negotiation, and completing negotiation tasks closes the deal. Earlier stages (lead, contacted, qualifying) are relationship-driven and shouldn't auto-advance.

**Alternative considered**: Advance to "won" always when all tasks done — too aggressive, negotiation tasks completing doesn't always mean deal is won.

### D4: Sync action architecture

**Decision**: Add a "full-sync" action to the existing `/api/pipeline/kanban-bridge` endpoint that runs both directions:
1. Pipeline→Kanban: Apply stage→status mapping for all opportunities with linked tasks
2. Kanban→Pipeline: Check all opportunities for reverse stage advancement
3. Recalculate progress for all won opportunities

**Rationale**: Single atomic endpoint simplifies the sync story. The existing "sync-progress" action continues to work for backward compatibility.

## Risks / Trade-offs

- **[Text-based linking is fragile]** → Company name changes break the link. Mitigation: Document the convention clearly. Full fix (junction table) is a separate change.
- **[Duplicate task creation on stage re-entry]** → If an opportunity goes from "proposal" → "negotiation" → back to "proposal", new tasks could be created. Mitigation: Check for existing linked tasks before creating new ones.
- **[Circular sync loops]** → Stage change triggers status change, which could trigger stage change. Mitigation: Only advance stage forward (never backward automatically), and only update task status when it actually changes.
- **[Performance]** → Full sync iterates all opportunities and all tasks. Mitigation: The data set is small (tens of opportunities, hundreds of tasks) — acceptable for now.
