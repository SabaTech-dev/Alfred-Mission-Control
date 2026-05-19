# AMC Optimization Batch — Tasks

## Task 1: Loading Skeletons ✅
**Status**: Complete
- Created 14 loading.tsx files across all dashboard pages
- Uses existing `Skeleton` component from `@/components/ui/skeleton`
- Mimics actual page layout for smooth perceived loading
- Heavy pages (pipeline, office, catalog, kanban) have detailed skeletons

## Task 2: Auto-Sync Pipeline ✅
**Status**: Complete
- Created `/api/pipeline/auto-sync` endpoint
- Scans reports/central/active/ across all specialist workspaces
- Creates/updates pipeline opportunities from reports
- Returns pipeline data + sync results in single response
- PipelineClient fetches from auto-sync on load with fallback to regular endpoint

## Task 3: Pipeline KPIs Dashboard ✅
**Status**: Complete
- Extended `PipelineKPIs` type with `avg_cycle_time_days`, `agent_utilization`, `total_active_agents`
- Updated `getPipelineKPIs()` to calculate cycle time from won deals (created_at → closed_at)
- Agent utilization counts distinct assignees from active Kanban tasks
- Added Clock and Users icons + KPI cards to pipeline page

## Task 4: Pipeline↔Kanban Bridge ✅
**Status**: Complete
- Created `/api/pipeline/kanban-bridge` endpoint (GET + POST)
- POST `sync-progress`: recalculates opportunity progress from Kanban task completion
- POST `link-task`: generates link instruction for task→opportunity association
- GET: returns linked opportunities with their Kanban tasks
- PipelineClient triggers bridge sync on every page load (non-blocking)
- Existing bridge (won→create tasks) remains unchanged

## Task 5: Split Large Components ✅
**Status**: Complete
- **PipelineClient.tsx**: 1054 → 701 lines (extracted OppCard, KpiCard, forms, ResearchPipeline)
- **CatalogClient.tsx**: 960 → 612 lines (extracted InventoryTab)
- **Office3D.tsx**: Already refactored to 254 lines in prior session
- All extracted components maintain identical behavior
