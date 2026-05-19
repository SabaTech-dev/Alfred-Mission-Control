# pipeline-kpi Specification

## Purpose
TBD - created by archiving change amc-pipeline-kpi. Update Purpose after archive.
## Requirements
### Requirement: Filter-Aware KPI Cards

The pipeline page SHALL display KPI cards that recalculate when filters (date range, service type, stage) change. The cards SHALL show: Total Opportunities, Total Pipeline Value (active stages), Avg Cycle Time (won deals), Agent Utilization, Won Value, Win Rate.

#### Scenario: No filters active — shows all-time totals
- GIVEN the user is on the Pipeline page
- WHEN no filters are active
- THEN KPI cards show totals computed from ALL opportunities

#### Scenario: Date range filter applied — KPIs recalculate
- GIVEN the user sets a date range filter
- WHEN the filtered opportunities update
- THEN KPI cards recalculate from only the matching opportunities

#### Scenario: Service type filter applied — KPIs recalculate
- GIVEN the user sets a service type filter
- WHEN the filtered opportunities update
- THEN KPI cards recalculate from only the matching opportunities

### Requirement: Funnel Chart by Stage

The pipeline page SHALL display a horizontal bar chart showing opportunity distribution across all pipeline stages with stage-colored bars, counts, and values in tooltip.

#### Scenario: Funnel renders with opportunity data
- GIVEN the pipeline page has opportunities loaded
- WHEN the funnel chart renders
- THEN each stage shows a horizontal bar with count and color matching STAGE_COLORS

#### Scenario: Funnel updates when filters change
- GIVEN the user applies a filter
- WHEN the filtered opportunities change
- THEN the funnel chart re-renders with filtered data only

#### Scenario: Empty state when no data
- GIVEN no opportunities match the current filters
- WHEN the funnel chart renders
- THEN a "no data" message is displayed instead of an empty chart

### Requirement: useFilteredKPIs Hook

A `useFilteredKPIs` function SHALL compute KPI metrics from a given opportunities array, returning totalOpportunities, totalPipelineValue, avgCycleTimeDays, wonCount, wonValue, lostCount, winRate.

#### Scenario: Accurate computation from opportunity array
- GIVEN an array of 10 opportunities (7 active, 2 won, 1 lost)
- WHEN useFilteredKPIs is called
- THEN totalOpportunities is 10, wonCount is 2, lostCount is 1, winRate is 0.667, totalPipelineValue sums only the 7 active stages

