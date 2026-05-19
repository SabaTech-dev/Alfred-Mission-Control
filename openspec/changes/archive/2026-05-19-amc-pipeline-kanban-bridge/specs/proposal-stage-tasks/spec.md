## ADDED Requirements

### Requirement: Auto-create Kanban tasks at proposal stage
The system SHALL automatically create a set of Kanban tasks when an opportunity's stage changes to "proposal" AND no linked tasks already exist for that opportunity. Tasks SHALL be created with `createdBy: "pipeline-automation"` and include `[Opportunity: {company}]` in the description for linking.

#### Scenario: Opportunity moves to proposal stage
- **WHEN** an opportunity stage changes from any stage (except "proposal") to "proposal"
- **THEN** the system SHALL create 3 Kanban tasks: "Research & preparation - {company}", "Draft proposal - {company}", "Internal review - {company}" with status "backlog"

#### Scenario: Opportunity already has linked tasks at proposal stage
- **WHEN** an opportunity stage changes to "proposal" AND Kanban tasks with `[Opportunity: {company}]` already exist
- **THEN** the system SHALL NOT create duplicate tasks

#### Scenario: Proposal task templates vary by service type
- **WHEN** an opportunity with `service_type` starting with "orquestacion" moves to proposal stage
- **THEN** the created tasks SHALL reflect orchestration-specific proposal work (architecture review, technical proposal, feasibility review)

### Requirement: Keep existing won-stage task creation
The system SHALL preserve the existing behavior of creating tasks when an opportunity reaches "won" stage. Won-stage tasks SHALL be created regardless of whether proposal-stage tasks were previously created.

#### Scenario: Opportunity moves to won stage with existing proposal tasks
- **WHEN** an opportunity moves from "proposal" to "won" AND proposal tasks exist
- **THEN** the system SHALL create the standard won-stage tasks (distinct from proposal tasks)

#### Scenario: Opportunity moves directly to won without proposal stage
- **WHEN** an opportunity moves from "negotiation" (or any non-won stage) directly to "won"
- **THEN** the system SHALL create won-stage tasks as before
