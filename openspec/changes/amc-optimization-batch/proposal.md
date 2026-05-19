# AMC Optimization Batch — Proposal

## Intent
Optimize Alfred Mission Control with five improvements: loading skeletons, pipeline auto-sync, KPI enhancements, bidirectional kanban bridge, and component splitting.

## Scope
- **Loading Skeletons**: Add `loading.tsx` for all dashboard pages (pipeline, agents, catalog, office, kanban, analytics, system, reports, files, sessions, settings, workflows, dashboard root)
- **Auto-Sync Pipeline**: Create `/api/pipeline/auto-sync` endpoint that syncs reports to pipeline opportunities on every page load
- **Pipeline KPIs**: Add avg cycle time and agent utilization KPI cards
- **Pipeline↔Kanban Bridge**: Create `/api/pipeline/kanban-bridge` for bidirectional sync (kanban task progress → opportunity progress)
- **Component Splitting**: Extract sub-components from PipelineClient (OppCard, KpiCard, form fields, research pipeline), CatalogClient (InventoryTab), and Office3D (types, config, utils)

## Approach
1. Create loading.tsx files using existing `Skeleton` component from `@/components/ui/skeleton`
2. Build auto-sync API that calls existing `syncReportsToPipeline` + returns pipeline data
3. Extend `PipelineKPIs` type with `avg_cycle_time_days` and `agent_utilization`
4. Create kanban-bridge API endpoint for progress sync
5. Extract components into focused files, maintaining existing behavior

## Files Changed
- `src/app/(dashboard)/*/loading.tsx` — New skeleton files (14 files)
- `src/app/api/pipeline/auto-sync/route.ts` — New auto-sync endpoint
- `src/app/api/pipeline/kanban-bridge/route.ts` — New bidirectional bridge
- `src/lib/pipeline-types.ts` — Extended PipelineKPIs interface
- `src/lib/pipeline-db.ts` — Updated getPipelineKPIs calculation
- `src/app/(dashboard)/pipeline/PipelineClient.tsx` — Uses auto-sync + new KPIs
- `src/app/(dashboard)/pipeline/OppCard.tsx` — Extracted from PipelineClient
- `src/app/(dashboard)/pipeline/PipelineComponents.tsx` — Extracted KPI + form components
- `src/app/(dashboard)/pipeline/ResearchPipeline.tsx` — Extracted research section
- `src/app/(dashboard)/catalog/InventoryTab.tsx` — Extracted from CatalogClient
- `src/app/(dashboard)/catalog/CatalogClient.tsx` — Reduced by extraction

## Tasks
- [x] Add loading skeletons for all pages
- [x] Create auto-sync pipeline API endpoint
- [x] Integrate auto-sync into PipelineClient
- [x] Extend PipelineKPIs with cycle time and agent utilization
- [x] Add new KPI cards to pipeline page
- [x] Create kanban-bridge API for bidirectional sync
- [x] Trigger bridge sync on pipeline page load
- [x] Extract PipelineClient sub-components
- [x] Extract CatalogClient inventory tab
- [x] Verify TypeScript compilation passes
