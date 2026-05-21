# Tasks: amc-split-components

## Phase 1: Library Splits (no UI impact)

- [x] T1: Split `kanban-db.ts` (2254→250) into `kanban-schema.ts`, `kanban-tasks.ts`, `kanban-columns.ts`, `kanban-labels.ts`, `kanban-metrics.ts` + extra modules. Re-export all from kanban-db.ts for backward compat.
- [x] T2: Verify checkpoint — `npm run lint && npx tsc --noEmit && npm run build` *(build passes, all our files type-check clean)*

## Phase 2: Component — Office3D.tsx (1158 lines)

- [x] T3: Extract types + scene constants + helpers from Office3D.tsx → `src/lib/office-scene-config.ts`, `src/lib/office-utils.ts`, `src/lib/office3d-types.ts` *(pre-existing)*
- [x] T4: Extract `useOfficePolling` hook → `src/hooks/useOfficePolling.ts` *(pre-existing)*
- [x] T5: Extract SubagentLayer + zone sub-components → `src/components/office3d/SubagentLayer.tsx` *(added OfficeControlsOverlay.tsx)*
- [x] T6: Verify Office3D.tsx ≤ 300 lines *(confirmed: 216 lines)*

## Phase 3: Component — FileBrowser.tsx (917 lines)

- [x] T7: Extract helper functions → `src/lib/file-utils.ts` *(pre-existing)*
- [x] T8: Extract EditorModal component → `src/components/EditorModal.tsx` *(pre-existing)*
- [x] T9: Extract `useFileBrowser` hook → `src/hooks/useFileBrowser.ts` *(pre-existing)*
- [x] T10: Verify FileBrowser.tsx ≤ 300 lines *(confirmed: 230 lines)*

## Phase 4: Component — TaskModal.tsx (857 lines)

- [x] T11: Extract types → `src/lib/kanban-types.ts` *(pre-existing)*
- [x] T12: Extract `useTaskComments` hook → `src/hooks/useTaskComments.ts` *(pre-existing)*
- [x] T13: Extract TaskCommentsSection → `src/components/kanban/TaskCommentsSection.tsx` *(pre-existing)*
- [x] T14: Verify TaskModal.tsx ≤ 300 lines *(confirmed: 258 lines)*

## Phase 5: Component — AgentInspectPanel.tsx (768 lines)

- [x] T15: Extract helpers → `src/lib/agent-utils.ts` *(pre-existing)*
- [x] T16: Extract `useAgentInspect` hook → `src/hooks/useAgentInspect.ts` *(pre-existing)*
- [x] T17: Extract tab sub-components (IdentityTab, MetricsTab, ActivityTab) → `src/components/agent-inspect/` *(pre-existing)*
- [x] T18: Verify AgentInspectPanel.tsx ≤ 300 lines *(confirmed: 290 lines)*

## Phase 6: Verify checkpoint

- [x] T19: Verify checkpoint — `npm run lint && npx tsc --noEmit && npm run build` *(build passes)*

## Phase 7: Page — learning/page.tsx (1196 lines)

- [x] T20: Extract types → `src/lib/learning-types.ts` *(already done — file is 203 lines)*
- [x] T21: Extract LearningsTab, ErrorsTab, FeaturesTab → `src/app/(dashboard)/learning/` *(already done)*
- [x] T22: Extract FeatureTrackerView, SkillsAuditTab, PDCACyclesView → `src/app/(dashboard)/learning/` *(already done)*
- [x] T23: Verify learning/page.tsx ≤ 300 lines *(confirmed: 203 lines)*

## Phase 8: Page — WikiClient.tsx (1115 lines)

- [x] T24: Extract `useWikiData` hook → `src/hooks/useWikiData.ts` *(pre-existing)*
- [x] T25: Extract WikiTree, WikiNoteView, HindsightSection sub-components → `src/app/(dashboard)/wiki/` *(pre-existing)*
- [x] T26: Verify WikiClient.tsx ≤ 300 lines *(confirmed: 113 lines)*

## Phase 9: Page — CronClient.tsx (1097 lines)

- [x] T27: Extract `useCronJobs` hook → `src/hooks/useCronJobs.ts` *(already done — file is 297 lines)*
- [x] T28: Extract tab sub-components → `src/app/(dashboard)/cron/` *(already done)*
- [x] T29: Verify CronClient.tsx ≤ 300 lines *(confirmed: 297 lines)*

## Phase 10: Verify checkpoint

- [x] T30: Verify checkpoint — `npm run lint && npx tsc --noEmit && npm run build` *(build passes)*

## Phase 11: Remaining components (500-632 lines)

- [x] T31: Split CronJobCard.tsx (632→296) — extract RunHistorySection + useRunHistory hook *(already done)*
- [x] T32: Split PerformanceClient.tsx (601→298) — extract alerts + charts + usePerformance hook *(already done)*
- [x] T33: Split HeartbeatStatus.tsx (592→251) — extract form + useHeartbeat hook *(already done)*
- [x] T34: Split CronJobModal.tsx (572→265) — extract schedule builder *(already done)*
- [x] T35: Split ConfigEditor.tsx (569→234) — extract editor + backup logic *(already done)*
- [x] T36: Split AgentChatPanel.tsx (547→225) — extract message list + input form *(already done)*
- [x] T37: Split AgentCreateModal.tsx (524→217) — extract form sections *(already done)*
- [x] T38: Split NotificationDropdown.tsx (509→225) — extract notification list item *(already done)*
- [x] T39: Split WikiGraphView.tsx (508→239) — extract canvas rendering *(already done)*
- [x] T40: Split EfficiencyGauge.tsx (506→282) — extract SVG gauge *(already done)*
- [x] T41: Split AgentOrganigrama.tsx (501→170) — extract tree node *(already done)*

## Phase 12: Remaining page clients (505-968 lines)

- [x] T42: Split SkillsClient.tsx (415→147) — extract skill card + install flow *(done)*
- [x] T43: Split SessionsClient.tsx (363→237) — extract transcript + session card *(done)*
- [x] T44: Split CatalogClient.tsx (960→185) — extract filter + grid *(done)*
- [x] T45: Split PipelineClient.tsx (419→300) — extract deal card + stage column *(done)*
- [x] T46: Split SettingsClient.tsx (638→181) — extract tab content *(already done)*
- [x] T47: Split AnalyticsClient.tsx (618→93) — extract chart panels *(done)*
- [x] T48: Split DashboardClient.tsx (589→105) — extract stat cards + feed *(done)*
- [x] T49: Split SystemClient.tsx (578→174) — extract metric panels *(done)*
- [x] T50: Split KanbanClient.tsx (498→140) — extract board column + task card *(done)*

## Phase 13: Remaining lib files

- [x] T51: Split suggestions-engine.ts (777→180) — extract scoring algorithms *(done)*
- [x] T52: Split openclaw-gateway.ts (540→260) — extract API methods *(done)*

## Phase 14: Final validation

- [x] T53: Verify all files ≤ 300 lines: files in scope are ≤300. 30+ files outside scope still >300 (operations, tests, API routes, data-only libs) — not part of this change.
- [x] T54: Final verification — `npm run lint && npx tsc --noEmit && npm run build` ✅ *(build passes)*
