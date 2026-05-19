# Design: amc-split-components

## Architecture

### Extraction Pattern

Every large file follows the same 4-step extraction:

```
Original File (800+ lines)
├── Types/Interfaces    →  src/lib/*-types.ts
├── Helper Functions    →  src/lib/*-utils.ts
├── Data Fetching       →  src/hooks/use*.ts
└── Sub-components      →  src/components/<feature>/SubComponent.tsx
    └── Parent imports and composes
```

### Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Hook | `use<Feature>` | `useOfficePolling`, `useAgentInspect` |
| Types file | `<domain>-types.ts` | `learning-types.ts`, `kanban-types.ts` |
| Utils file | `<domain>-utils.ts` | `office-utils.ts`, `file-utils.ts` |
| Sub-component | `<Feature><Section>.tsx` | `TaskCommentsSection.tsx`, `RunHistorySection.tsx` |
| Sub-component dir | `src/components/<feature>/` | `src/components/kanban/`, `src/components/office3d/` |

### Directory Structure (New Files)

```
src/
├── hooks/
│   ├── useOfficePolling.ts          ← from Office3D.tsx
│   ├── useFileBrowser.ts            ← from FileBrowser.tsx
│   ├── useTaskComments.ts           ← from TaskModal.tsx
│   ├── useAgentInspect.ts           ← from AgentInspectPanel.tsx
│   ├── useRunHistory.ts             ← from CronJobCard.tsx
│   ├── useCronJobs.ts               ← from CronClient.tsx
│   ├── useWikiData.ts               ← from WikiClient.tsx
│   ├── usePerformance.ts            ← from PerformanceClient.tsx
│   └── useHeartbeat.ts              ← from HeartbeatStatus.tsx
├── lib/
│   ├── learning-types.ts            ← from learning/page.tsx
│   ├── office-scene-config.ts       ← from Office3D.tsx
│   ├── office-utils.ts              ← from Office3D.tsx
│   ├── file-utils.ts                ← from FileBrowser.tsx
│   ├── agent-utils.ts               ← from AgentInspectPanel.tsx
│   ├── kanban-types.ts              ← from TaskModal.tsx + kanban-db.ts
│   ├── cron-utils.ts                ← from CronJobCard.tsx + CronJobModal.tsx
│   └── kanban/
│       ├── kanban-tasks.ts          ← from kanban-db.ts
│       ├── kanban-columns.ts        ← from kanban-db.ts
│       ├── kanban-comments.ts       ← already exists (189 lines)
│       ├── kanban-metrics.ts        ← from kanban-db.ts
│       ├── kanban-labels.ts         ← from kanban-db.ts
│       └── kanban-schema.ts         ← from kanban-db.ts
├── components/
│   ├── EditorModal.tsx              ← from FileBrowser.tsx
│   ├── kanban/
│   │   └── TaskCommentsSection.tsx  ← from TaskModal.tsx
│   └── office3d/
│       ├── SceneConstants.tsx       ← from Office3D.tsx
│       └── SubagentLayer.tsx        ← from Office3D.tsx
├── app/(dashboard)/learning/
│   ├── LearningsTab.tsx             ← from page.tsx
│   ├── ErrorsTab.tsx                ← from page.tsx
│   ├── FeaturesTab.tsx              ← from page.tsx
│   ├── FeatureTrackerView.tsx       ← from page.tsx
│   └── SkillsAuditTab.tsx           ← from page.tsx
└── (similar pattern for other pages)
```

### Extraction Rules

1. **Hook extraction**: All `useState` + `useEffect` + `fetch` blocks go into hooks. Hooks return typed objects.
2. **Component extraction**: Sub-components receive props (no shared state via context unless already using one).
3. **Type exports**: All interfaces are exported from types files. Components import from types files.
4. **Barrel imports**: If a directory gets 3+ files, add an `index.ts` barrel.
5. **i18n keys unchanged**: No translation key changes. Components continue using `useI18n()`.
6. **CSS variables unchanged**: No styling changes. Extracted components use same CSS variables.

### kanban-db.ts Split Strategy

The largest file (2240 lines) splits by domain:

```
kanban-db.ts (remaining ~200 lines: re-exports + DB init)
├── kanban-schema.ts    ← CREATE TABLE statements, migrations
├── kanban-tasks.ts     ← Task CRUD, status changes, claiming
├── kanban-columns.ts   ← Column CRUD, reordering
├── kanban-labels.ts    ← Label CRUD
├── kanban-comments.ts  ← Already exists (189 lines) — keep as-is
└── kanban-metrics.ts   ← Stats, metrics, agent queries
```

Each module imports a shared `getDb()` function from the main file.

### Processing Order (by impact)

1. **kanban-db.ts** (2240 → ~200) — biggest file, lib only, no UI impact
2. **Office3D.tsx** (1158 → ~280) — hook + scene config + helpers
3. **learning/page.tsx** (1196 → ~250) — 5 tab extractions
4. **FileBrowser.tsx** (917 → ~280) — EditorModal + utils + hook
5. **TaskModal.tsx** (857 → ~280) — comments section + hook
6. **WikiClient.tsx** (1115 → ~280) — tree/note/hindsight
7. **CronClient.tsx** (1097 → ~280) — tabs + hook
8. **AgentInspectPanel.tsx** (768 → ~280) — tabs + hook
9. **CronJobCard.tsx** (632 → ~280) — run history + hook
10. **PerformanceClient.tsx** (601 → ~280) — alerts + hook
11. **HeartbeatStatus.tsx** (592 → ~280) — form + hook
12. **CronJobModal.tsx** (572 → ~280) — schedule builder
13. **ConfigEditor.tsx** (569 → ~280) — editor section
14. **AgentChatPanel.tsx** (547 → ~280) — message list + input
15. **AgentCreateModal.tsx** (524 → ~280) — form sections
16. **NotificationDropdown.tsx** (509 → ~280) — list item
17. **WikiGraphView.tsx** (508 → ~280) — canvas rendering
18. **EfficiencyGauge.tsx** (506 → ~280) — SVG gauge
19. **AgentOrganigrama.tsx** (501 → ~280) — tree node
20. **SkillsClient.tsx** (1017 → ~280) — skill card + install
21. **SessionsClient.tsx** (968 → ~280) — transcript + session card
22. **CatalogClient.tsx** (960 → ~280) — filter + grid
23. **PipelineClient.tsx** (793 → ~280) — deal card + stage
24. **SettingsClient.tsx** (638 → ~280) — tab content
25. **AnalyticsClient.tsx** (618 → ~280) — chart panels
26. **DashboardClient.tsx** (589 → ~280) — stat cards + feed
27. **SystemClient.tsx** (578 → ~280) — metric panels
28. **KanbanClient.tsx** (505 → ~280) — board column + task card
29. **suggestions-engine.ts** (777 → ~300) — scoring algorithms
30. **openclaw-gateway.ts** (540 → ~300) — API methods

### Verification Checkpoints

After every 5 files split:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`

Final verification:
1. All files under 300 lines: `find src -name '*.tsx' -o -name '*.ts' | xargs wc -l | awk '$1 > 300'`
2. No functionality loss: manual review of imports
3. Types complete: no `any` types introduced
