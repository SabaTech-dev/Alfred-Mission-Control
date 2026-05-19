# Tasks: amc-pipeline-kpi

## Implementation Tasks

- [x] T1: Create `useFilteredKPIs` hook in `PipelineClient.tsx` to compute filter-aware metrics from `filteredOpportunities`
- [x] T2: Create `PipelineFunnelChart.tsx` component using Recharts horizontal BarChart with stage colors and counts
- [x] T3: Update `PipelineClient.tsx` KPI section to use `useFilteredKPIs` for the 4 core KPI cards (Total Opps, Total Value, Avg Cycle Time, Agent Utilization)
- [x] T4: Insert `PipelineFunnelChart` between KPI cards and Research Pipeline section, fed by filtered data
- [x] T5: Verify lint, type-check, and build pass with no errors
