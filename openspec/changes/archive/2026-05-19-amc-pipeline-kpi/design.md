# Design: Pipeline KPI + Funnel

## Architecture

### Component Tree (changes only)
```
PipelineClient
├── KPI Section (replaces existing static KPI cards)
│   ├── FilteredKpiCard × 4  (Total Opps, Total Value, Avg Cycle Time, Agent Utilization)
│   └── (existing KpiCard components kept for secondary metrics)
├── PipelineFunnelChart  ← NEW
├── Research Pipeline
├── Pipeline Columns / List View
└── Won/Lost Section
```

### Data Flow
```
filteredOpportunities (client-side filtered)
       ↓
useFilteredKPIs(filteredOpportunities)  ← NEW hook
       ↓
FilteredKPIs { totalOpportunities, totalPipelineValue, avgCycleTimeDays, ... }
       ↓
KPI Cards + Funnel Chart
```

### Files Changed

| File | Change |
|------|--------|
| `src/app/(dashboard)/pipeline/PipelineClient.tsx` | Add `useFilteredKPIs` hook, import `PipelineFunnelChart`, wire filters to KPIs |
| `src/app/(dashboard)/pipeline/PipelineFunnelChart.tsx` | NEW — Recharts horizontal BarChart |
| `src/lib/pipeline-types.ts` | No changes (existing types sufficient) |

### Hook: `useFilteredKPIs`
Pure function hook, no side effects. Computes metrics from the filtered array:

```typescript
function useFilteredKPIs(opps: Opportunity[]): FilteredKPIs
```

Calculations:
- `totalOpportunities`: `opps.length`
- `totalPipelineValue`: sum of `opp.value` where stage not won/lost
- `avgCycleTimeDays`: mean of `(closed_at - created_at)` in days for won deals
- `wonCount`, `wonValue`, `lostCount`, `lostValue`: aggregations by stage
- `winRate`: `wonCount / (wonCount + lostCount)` or 0

### Component: `PipelineFunnelChart`
- Uses Recharts `BarChart` with horizontal layout (`layout="vertical"`)
- Receives `FunnelStage[]` computed from `filteredOpportunities`
- Shows stage label, count, and value as tooltip
- Bar color matches `STAGE_COLORS`
- Responsive width via `ResponsiveContainer`

### No Backend Changes
All KPI computation happens client-side from the existing `opportunities` array. The server `getPipelineKPIs()` remains for unfiltered totals and agent utilization.
