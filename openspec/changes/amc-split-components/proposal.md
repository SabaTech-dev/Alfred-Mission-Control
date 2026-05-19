# Proposal: amc-split-components

## Intent
Split all components exceeding 500 lines into smaller, focused components (max 300 lines each). Extract inline data-fetching logic into custom hooks. Add comprehensive TypeScript types. Maintain 100% of existing functionality.

## Problem
27 files exceed 500 lines (15 components, 12 page clients, 6 lib files). The largest component is `kanban-db.ts` at 2240 lines. This creates:
- Hard-to-review PRs
- Duplicated fetch patterns across components
- No separation between data logic and presentation
- Poor testability due to monolithic structures

## Scope

### In Scope — Components >500 lines (15 files)
| File | Lines | Strategy |
|------|-------|----------|
| `Office3D.tsx` | 1158 | Extract `useOfficePolling` hook, scene config, helpers |
| `FileBrowser.tsx` | 917 | Extract `EditorModal`, file utils, `useFileBrowser` hook |
| `TaskModal.tsx` | 857 | Extract `TaskCommentsSection`, `useTaskComments` hook |
| `AgentInspectPanel.tsx` | 768 | Extract tab components, `useAgentInspect` hook |
| `CronJobCard.tsx` | 632 | Extract `RunHistorySection`, `useRunHistory` hook |
| `PerformanceClient.tsx` | 601 | Extract alert logic, charts sub-component |
| `HeartbeatStatus.tsx` | 592 | Extract form section, `useHeartbeat` hook |
| `CronJobModal.tsx` | 572 | Extract schedule builder sub-component |
| `ConfigEditor.tsx` | 569 | Extract editor section, backup logic |
| `AgentChatPanel.tsx` | 547 | Extract message list, input form |
| `AgentCreateModal.tsx` | 524 | Extract form sections |
| `NotificationDropdown.tsx` | 509 | Extract notification list item |
| `WikiGraphView.tsx` | 508 | Extract D3/Canvas rendering logic |
| `EfficiencyGauge.tsx` | 506 | Extract SVG gauge rendering |
| `AgentOrganigrama.tsx` | 501 | Extract tree node rendering |

### In Scope — Page clients >500 lines (12 files)
| File | Lines | Strategy |
|------|-------|----------|
| `learning/page.tsx` | 1196 | Extract 5 tab views + types file |
| `wiki/WikiClient.tsx` | 1115 | Extract tree/note/hindsight sub-components |
| `cron/CronClient.tsx` | 1097 | Extract tab views + `useCronJobs` hook |
| `skills/SkillsClient.tsx` | 1017 | Extract skill card, install flow |
| `sessions/SessionsClient.tsx` | 968 | Extract transcript viewer, session card |
| `catalog/CatalogClient.tsx` | 960 | Extract filter panel, grid view |
| `pipeline/PipelineClient.tsx` | 793 | Extract deal card, stage column |
| `settings/SettingsClient.tsx` | 638 | Extract tab content components |
| `analytics/AnalyticsClient.tsx` | 618 | Extract chart panels |
| `DashboardClient.tsx` | 589 | Extract stat cards, activity feed |
| `system/SystemClient.tsx` | 578 | Extract metric panels |
| `kanban/KanbanClient.tsx` | 505 | Extract board column, task card |

### In Scope — Lib files >500 lines (4 files)
| File | Lines | Strategy |
|------|-------|----------|
| `kanban-db.ts` | 2240 | Split into domain modules |
| `suggestions-engine.ts` | 777 | Extract scoring algorithms |
| `openclaw-gateway.ts` | 540 | Extract API methods |
| `suggestions-data.ts` | 514 | Already data-only, minimal split |

## Approach
1. **Hooks first**: Extract data fetching logic into `use*` hooks under `src/hooks/`
2. **Sub-components**: Extract visual sections into named components in same directory or `src/components/<feature>/`
3. **Types files**: Move interfaces to `src/lib/*-types.ts` for shared use
4. **Utils**: Move helper functions to `src/lib/*-utils.ts`
5. **Verify**: After each split, run `npm run lint && npx tsc --noEmit && npm run build`

## DoD (Definition of Done)
- [ ] All components <= 300 lines
- [ ] No functionality loss
- [ ] TypeScript types complete for all extracted modules
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
