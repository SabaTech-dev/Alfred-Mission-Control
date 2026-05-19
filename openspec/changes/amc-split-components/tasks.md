# Tasks: amc-split-components

## Phase 1: Library Splits (no UI impact)

- [ ] T1: Split `kanban-db.ts` (2240→~200 lines) into `kanban-schema.ts`, `kanban-tasks.ts`, `kanban-columns.ts`, `kanban-labels.ts`, `kanban-metrics.ts`. Re-export all from kanban-db.ts for backward compat.
- [ ] T2: Verify checkpoint — `npm run lint && npx tsc --noEmit && npm run build`

## Phase 2: Component — Office3D.tsx (1158 lines)

- [ ] T3: Extract types + scene constants + helpers from Office3D.tsx → `src/lib/office-scene-config.ts`, `src/lib/office-utils.ts`, `src/lib/office3d-types.ts`
- [ ] T4: Extract `useOfficePolling` hook → `src/hooks/useOfficePolling.ts`
- [ ] T5: Extract SubagentLayer + zone sub-components → `src/components/office3d/SubagentLayer.tsx`
- [ ] T6: Verify Office3D.tsx ≤ 300 lines

## Phase 3: Component — FileBrowser.tsx (917 lines)

- [ ] T7: Extract helper functions → `src/lib/file-utils.ts`
- [ ] T8: Extract EditorModal component → `src/components/EditorModal.tsx`
- [ ] T9: Extract `useFileBrowser` hook → `src/hooks/useFileBrowser.ts`
- [ ] T10: Verify FileBrowser.tsx ≤ 300 lines

## Phase 4: Component — TaskModal.tsx (857 lines)

- [ ] T11: Extract types → `src/lib/kanban-types.ts`
- [ ] T12: Extract `useTaskComments` hook → `src/hooks/useTaskComments.ts`
- [ ] T13: Extract TaskCommentsSection → `src/components/kanban/TaskCommentsSection.tsx`
- [ ] T14: Verify TaskModal.tsx ≤ 300 lines

## Phase 5: Component — AgentInspectPanel.tsx (768 lines)

- [ ] T15: Extract helpers → `src/lib/agent-utils.ts`
- [ ] T16: Extract `useAgentInspect` hook → `src/hooks/useAgentInspect.ts`
- [ ] T17: Extract tab sub-components (IdentityTab, MetricsTab, ActivityTab) → `src/components/agent-inspect/`
- [ ] T18: Verify AgentInspectPanel.tsx ≤ 300 lines

## Phase 6: Verify checkpoint

- [ ] T19: Verify checkpoint — `npm run lint && npx tsc --noEmit && npm run build`

## Phase 7: Page — learning/page.tsx (1196 lines)

- [ ] T20: Extract types → `src/lib/learning-types.ts`
- [ ] T21: Extract LearningsTab, ErrorsTab, FeaturesTab → `src/app/(dashboard)/learning/`
- [ ] T22: Extract FeatureTrackerView, SkillsAuditTab, PDCACyclesView → `src/app/(dashboard)/learning/`
- [ ] T23: Verify learning/page.tsx ≤ 300 lines

## Phase 8: Page — WikiClient.tsx (1115 lines)

- [ ] T24: Extract `useWikiData` hook → `src/hooks/useWikiData.ts`
- [ ] T25: Extract WikiTree, WikiNoteView, HindsightSection sub-components → `src/app/(dashboard)/wiki/`
- [ ] T26: Verify WikiClient.tsx ≤ 300 lines

## Phase 9: Page — CronClient.tsx (1097 lines)

- [ ] T27: Extract `useCronJobs` hook → `src/hooks/useCronJobs.ts`
- [ ] T28: Extract tab sub-components → `src/app/(dashboard)/cron/`
- [ ] T29: Verify CronClient.tsx ≤ 300 lines

## Phase 10: Verify checkpoint

- [ ] T30: Verify checkpoint — `npm run lint && npx tsc --noEmit && npm run build`

## Phase 11: Remaining components (500-632 lines)

- [ ] T31: Split CronJobCard.tsx (632) — extract RunHistorySection + useRunHistory hook
- [ ] T32: Split PerformanceClient.tsx (601) — extract alerts + charts + usePerformance hook
- [ ] T33: Split HeartbeatStatus.tsx (592) — extract form + useHeartbeat hook
- [ ] T34: Split CronJobModal.tsx (572) — extract schedule builder
- [ ] T35: Split ConfigEditor.tsx (569) — extract editor + backup logic
- [ ] T36: Split AgentChatPanel.tsx (547) — extract message list + input form
- [ ] T37: Split AgentCreateModal.tsx (524) — extract form sections
- [ ] T38: Split NotificationDropdown.tsx (509) — extract notification list item
- [ ] T39: Split WikiGraphView.tsx (508) — extract canvas rendering
- [ ] T40: Split EfficiencyGauge.tsx (506) — extract SVG gauge
- [ ] T41: Split AgentOrganigrama.tsx (501) — extract tree node

## Phase 12: Remaining page clients (505-968 lines)

- [ ] T42: Split SkillsClient.tsx (1017) — extract skill card + install flow
- [ ] T43: Split SessionsClient.tsx (968) — extract transcript + session card
- [ ] T44: Split CatalogClient.tsx (960) — extract filter + grid
- [ ] T45: Split PipelineClient.tsx (793) — extract deal card + stage column
- [ ] T46: Split SettingsClient.tsx (638) — extract tab content
- [ ] T47: Split AnalyticsClient.tsx (618) — extract chart panels
- [ ] T48: Split DashboardClient.tsx (589) — extract stat cards + feed
- [ ] T49: Split SystemClient.tsx (578) — extract metric panels
- [ ] T50: Split KanbanClient.tsx (505) — extract board column + task card

## Phase 13: Remaining lib files

- [ ] T51: Split suggestions-engine.ts (777) — extract scoring algorithms
- [ ] T52: Split openclaw-gateway.ts (540) — extract API methods

## Phase 14: Final validation

- [ ] T53: Verify all files ≤ 300 lines: `find src -name '*.tsx' -o -name '*.ts' | xargs wc -l | sort -rn | head -20`
- [ ] T54: Final verification — `npm run lint && npx tsc --noEmit && npm run build`
