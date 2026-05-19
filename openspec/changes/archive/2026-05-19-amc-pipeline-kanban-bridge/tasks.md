## 1. Proposal-Stage Task Creation

- [x] 1.1 Add `PROPOSAL_TASK_TEMPLATES` constant to `pipeline-kanban-bridge.ts` with templates for each service type (default, orquestacion, security, qa)
- [x] 1.2 Add `createTasksForProposalStage()` function that creates proposal tasks only if no linked tasks already exist
- [x] 1.3 Add `shouldCreateProposalTasks()` guard function that checks stage is "proposal" and no existing linked tasks
- [x] 1.4 Extend `shouldCreateTasksForOpportunity()` to also trigger on "proposal" stage via the new guard

## 2. Stage-to-Status Sync (Pipeline → Kanban)

- [x] 2.1 Add `STAGE_STATUS_MAP` constant mapping pipeline stages to target Kanban task statuses (lost→archive, negotiation→in_progress, won→in_progress)
- [x] 2.2 Add `syncStageToTaskStatuses()` function that updates linked Kanban tasks based on the stage mapping
- [x] 2.3 Integrate `syncStageToTaskStatuses()` into `pipeline-db.ts:updateOpportunity()` bridge hook (after stage change detected)

## 3. Reverse Sync (Kanban → Pipeline Stage Advancement)

- [x] 3.1 Add `STAGE_ADVANCEMENT_MAP` constant mapping: proposal→negotiation, negotiation→won
- [x] 3.2 Add `checkStageAdvancement()` function that checks if all linked tasks are "done" and returns the target stage
- [x] 3.3 Integrate `checkStageAdvancement()` into `kanban-db.ts:updateTask()` bridge hook (after task status change)
- [x] 3.4 Integrate `checkStageAdvancement()` into `move` API route (after task move)

## 4. Full Bidirectional Sync API

- [x] 4.1 Add `fullSync()` function to `pipeline-kanban-bridge.ts` that runs pipeline→kanban + kanban→pipeline + progress recalculation
- [x] 4.2 Add "full-sync" action handler to `/api/pipeline/kanban-bridge` POST route
- [x] 4.3 Ensure full-sync is idempotent (no-op on second run with no changes)

## 5. Integration & Verification

- [x] 5.1 Run `npx tsc --noEmit` to verify no type errors
- [x] 5.2 Run `npm run lint` to verify no lint errors
- [x] 5.3 Run `npm run build` to verify production build succeeds
