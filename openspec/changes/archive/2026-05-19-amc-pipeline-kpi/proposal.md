# Proposal: amc-pipeline-kpi

## Intent
Add KPI dashboard cards and a funnel visualization to the Pipeline page, showing real-time business metrics that respect active filters (date range, service type, stage).

## Problem
The Pipeline page already renders KPI cards, but they always show server-wide totals from `getPipelineKPIs()`. Users cannot see filtered metrics for a specific time range or service type. There is no visual funnel chart showing opportunity distribution across stages.

## Scope
- **In scope:**
  - 4 core KPI cards: Total Opportunities, Total Pipeline Value, Avg Cycle Time, Agent Utilization
  - Funnel chart (horizontal bar chart by stage) using Recharts `BarChart`
  - KPI + funnel recalculate when filters (date range, service type, stage) change
  - Client-side computation from filtered `opportunities` array
- **Out of scope:**
  - Server-side filter API changes (filters already apply client-side)
  - New API endpoints
  - Changes to the opportunity CRUD or stage management

## Approach
1. Compute KPIs client-side from `filteredOpportunities` instead of relying solely on server `kpis`
2. Add a `PipelineFunnelChart` component using Recharts `BarChart` (horizontal bars, descending width by stage)
3. Replace the existing KPI card section with filter-aware cards
4. Insert the funnel chart between KPI cards and the pipeline columns

## DoD
- [x] KPI cards show accurate counts and values based on active filters
- [x] Funnel chart renders correctly with stage labels and counts
- [x] Date range filter affects KPIs and funnel
- [x] Service type filter affects KPIs and funnel
- [x] No regressions: existing pipeline, research, form features still work
- [x] Lint and type-check pass
