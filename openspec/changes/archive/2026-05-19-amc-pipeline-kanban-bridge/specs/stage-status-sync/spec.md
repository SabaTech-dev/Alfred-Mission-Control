## ADDED Requirements

### Requirement: Pipeline stage changes propagate to linked Kanban task statuses
The system SHALL update the status of linked Kanban tasks when an opportunity's stage changes. The mapping SHALL be: "lost" → archive all linked tasks, "negotiation" → move linked tasks to "in_progress", "won" → move linked tasks to "in_progress".

#### Scenario: Opportunity moves to lost stage
- **WHEN** an opportunity stage changes to "lost"
- **THEN** all Kanban tasks linked to that opportunity (via `[Opportunity: {company}]` in description) SHALL be archived

#### Scenario: Opportunity moves to negotiation stage
- **WHEN** an opportunity stage changes to "negotiation"
- **THEN** all linked Kanban tasks with status "backlog" SHALL be moved to "in_progress"

#### Scenario: Opportunity moves to won stage
- **WHEN** an opportunity stage changes to "won"
- **THEN** all linked Kanban tasks with status "backlog" or "in_progress" SHALL be moved to "in_progress"

#### Scenario: Stage change with no linked tasks
- **WHEN** an opportunity stage changes and no Kanban tasks are linked
- **THEN** no task status changes SHALL occur (no-op)

### Requirement: Stage-to-status mapping is idempotent
The system SHALL only update task statuses that actually differ from the target status. If a task is already in the target status, it SHALL NOT be updated.

#### Scenario: Task already in target status
- **WHEN** an opportunity moves to "negotiation" and a linked task is already "in_progress"
- **THEN** the task SHALL NOT be modified
