# Spec: Page Client Extraction

## Requirements
- All page clients >500 lines split to <=300 lines
- Each tab/section in multi-tab pages becomes its own component
- Data fetching extracted to hooks
- Types extracted to shared files
- All routes continue to work

## Scenarios

### Scenario 1: learning/page.tsx (1196 lines)
- **Given** the learning page has 7 tabs with 12+ interfaces
- **When** splitting
- **Then** types go to `src/lib/learning-types.ts`
- **And** each tab (LearningsTab, ErrorsTab, FeaturesTab, FeatureTrackerView, SkillsAuditTab, PDCACyclesView, TechRadarTab) is its own component
- **And** the main page is <=300 lines composing tabs

### Scenario 2: WikiClient.tsx (1115 lines)
- **Given** the wiki page has tree, note, search, graph, and hindsight sections
- **When** splitting
- **Then** data logic goes to `useWikiData` hook
- **And** visual sections (WikiTree, WikiNoteView, HindsightSection) are extracted

### Scenario 3: CronClient.tsx (1097 lines)
- **Given** the cron page has 4 tabs (all, system, openclaw, heartbeat)
- **When** splitting
- **Then** data logic goes to `useCronJobs` hook
- **And** tab content is extracted to sub-components

### Scenario 4: DashboardClient.tsx (589 lines)
- **Given** the dashboard has stat cards and activity feed
- **When** splitting
- **Then** stat cards section and activity feed section are extracted
- **And** the main component is <=300 lines

### Scenario 5: All page clients under 300 lines
- **Given** all page client extractions are complete
- **When** checking line counts of all *Client.tsx files
- **Then** none exceeds 300 lines
