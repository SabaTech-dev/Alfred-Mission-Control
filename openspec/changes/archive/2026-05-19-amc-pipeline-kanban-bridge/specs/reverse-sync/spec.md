## ADDED Requirements

### Requirement: All linked tasks completed advances pipeline stage
The system SHALL automatically advance an opportunity's pipeline stage when ALL linked Kanban tasks reach "done" status. The advancement mapping SHALL be: "proposal" → "negotiation", "negotiation" → "won". Stages "lead", "contacted", "qualifying", "won", "lost" SHALL NOT be auto-advanced.

#### Scenario: All proposal tasks completed
- **WHEN** the last linked Kanban task for a "proposal"-stage opportunity moves to "done"
- **THEN** the opportunity stage SHALL advance to "negotiation"

#### Scenario: All negotiation tasks completed
- **WHEN** the last linked Kanban task for a "negotiation"-stage opportunity moves to "done"
- **THEN** the opportunity stage SHALL advance to "won"

#### Scenario: Not all tasks completed yet
- **WHEN** a linked Kanban task moves to "done" but other linked tasks remain in non-done status
- **THEN** the opportunity stage SHALL NOT change

#### Scenario: Opportunity in lead stage with completed tasks
- **WHEN** all linked Kanban tasks for a "lead"-stage opportunity are "done"
- **THEN** the opportunity stage SHALL NOT change (no auto-advance from lead)

### Requirement: Reverse sync prevents backward stage movement
The system SHALL only advance stages forward. It SHALL NEVER move an opportunity to an earlier stage via automatic sync.

#### Scenario: Opportunity is already at a later stage
- **WHEN** all linked tasks for a "won"-stage opportunity are "done"
- **THEN** the opportunity stage SHALL remain "won" (no backward movement)

### Requirement: Full bidirectional sync via API
The system SHALL provide a "full-sync" action on the `/api/pipeline/kanban-bridge` endpoint that executes: (1) pipeline→kanban stage-to-status propagation for all opportunities, (2) kanban→pipeline reverse stage advancement check, (3) progress recalculation for won opportunities.

#### Scenario: Full sync execution
- **WHEN** a POST request is sent to `/api/pipeline/kanban-bridge` with `action: "full-sync"`
- **THEN** the system SHALL execute bidirectional sync and return a summary with counts of stages advanced, task statuses updated, and progress recalculated

#### Scenario: Full sync is idempotent
- **WHEN** full-sync is run twice with no intervening changes
- **THEN** the second run SHALL report zero changes
