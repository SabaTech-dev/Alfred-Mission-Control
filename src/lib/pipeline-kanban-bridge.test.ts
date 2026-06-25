// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock kanban-db to keep the bridge unit-isolated.
const _createTaskMock = vi.fn();
const _listTasksMock = vi.fn();
const _updateTaskMock = vi.fn();

vi.mock("@/lib/kanban-db", () => ({
  createTask: (input: unknown) => _createTaskMock(input),
  listTasks: () => _listTasksMock(),
  updateTask: (id: string, updates: unknown) => _updateTaskMock(id, updates),
}));

// Avoid the native SQLite binding for activities-db.
vi.mock("@/lib/activities-db", () => ({
  logActivity: () => undefined,
  resetDbForTesting: () => undefined,
}));

import {
  shouldCreateProposalTasks,
  createTasksForProposalStage,
  shouldCreateTasksForOpportunity,
  createTasksForWonOpportunity,
  syncStageToTaskStatuses,
  calculateOpportunityProgress,
  extractOpportunityCompany,
  checkStageAdvancement,
  fullSync,
  findActiveOpportunitiesByCompany,
} from "./pipeline-kanban-bridge";
import type { Opportunity, PipelineStage } from "./pipeline-types";
import type { KanbanTask } from "./kanban-db";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    company: "Acme Corp",
    contact_name: null,
    contact_email: null,
    contact_linkedin: null,
    title: "QA Framework",
    description: null,
    stage: "proposal",
    value: 10000,
    currency: "EUR",
    service_type: "other",
    probability: null,
    source: null,
    source_type: "manual",
    next_action: null,
    next_action_date: null,
    notes: null,
    progress: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    closed_at: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
  return {
    id: "task-1",
    title: "Some task",
    description: "[Opportunity: Acme Corp] original",
    status: "todo",
    priority: "medium",
    assignee: null,
    labels: [],
    order: 1,
    column_id: "todo",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    createdBy: null,
    projectId: null,
    domain: null,
    claimedBy: null,
    claimedAt: null,
    archived: false,
    ...overrides,
  } as unknown as KanbanTask;
}

describe("pipeline-kanban-bridge", () => {
  beforeEach(() => {
    _createTaskMock.mockReset();
    _listTasksMock.mockReset();
    _updateTaskMock.mockReset();
    _listTasksMock.mockReturnValue([]);
  });

  // ===========================================================================
  // shouldCreateProposalTasks
  // ===========================================================================
  describe("shouldCreateProposalTasks", () => {
    it("returns true when entering proposal from a different stage", () => {
      const opp = makeOpp({ stage: "proposal" });
      expect(shouldCreateProposalTasks(opp, "qualifying")).toBe(true);
    });

    it("returns false when already in proposal", () => {
      const opp = makeOpp({ stage: "proposal" });
      expect(shouldCreateProposalTasks(opp, "proposal")).toBe(false);
    });

    it("returns false when not in proposal", () => {
      const opp = makeOpp({ stage: "negotiation" });
      expect(shouldCreateProposalTasks(opp, "proposal")).toBe(false);
    });
  });

  // ===========================================================================
  // createTasksForProposalStage
  // ===========================================================================
  describe("createTasksForProposalStage", () => {
    it("returns [] and creates nothing when not entering proposal", () => {
      const opp = makeOpp({ stage: "negotiation" });
      expect(createTasksForProposalStage(opp, "qualifying")).toEqual([]);
      expect(_createTaskMock).not.toHaveBeenCalled();
    });

    it("returns [] when previousStage was already proposal", () => {
      const opp = makeOpp({ stage: "proposal" });
      expect(createTasksForProposalStage(opp, "proposal")).toEqual([]);
      expect(_createTaskMock).not.toHaveBeenCalled();
    });

    it("creates proposal tasks when entering proposal with no existing tasks", () => {
      const opp = makeOpp({ stage: "proposal" });
      _createTaskMock.mockImplementation((input: { title: string }) => ({
        ...makeTask(),
        id: `task-${input.title}`,
        title: input.title,
      }));

      const ids = createTasksForProposalStage(opp, "qualifying");

      expect(ids.length).toBeGreaterThan(0);
      expect(_createTaskMock).toHaveBeenCalledTimes(ids.length);
      // Each created task carries the [Opportunity: <company>] tag in description
      for (const call of _createTaskMock.mock.calls) {
        const input = call[0] as { description: string; title: string };
        expect(input.description).toContain("[Opportunity: Acme Corp]");
        expect(input.title).toContain("Acme Corp");
      }
    });

    it("skips creation when linked tasks already exist (dedup)", () => {
      const opp = makeOpp({ stage: "proposal" });
      _listTasksMock.mockReturnValue([
        makeTask({ description: "[Opportunity: Acme Corp] earlier work" }),
      ]);

      const ids = createTasksForProposalStage(opp, "qualifying");

      expect(ids).toEqual([]);
      expect(_createTaskMock).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // shouldCreateTasksForOpportunity
  // ===========================================================================
  describe("shouldCreateTasksForOpportunity", () => {
    it("returns true when entering won from a different stage", () => {
      const opp = makeOpp({ stage: "won" });
      expect(shouldCreateTasksForOpportunity(opp, "negotiation")).toBe(true);
    });

    it("returns false when already in won", () => {
      const opp = makeOpp({ stage: "won" });
      expect(shouldCreateTasksForOpportunity(opp, "won")).toBe(false);
    });

    it("returns false when not in won", () => {
      const opp = makeOpp({ stage: "negotiation" });
      expect(shouldCreateTasksForOpportunity(opp, "qualifying")).toBe(false);
    });
  });

  // ===========================================================================
  // createTasksForWonOpportunity
  // ===========================================================================
  describe("createTasksForWonOpportunity", () => {
    it("returns [] and creates nothing when not entering won", () => {
      const opp = makeOpp({ stage: "negotiation" });
      expect(createTasksForWonOpportunity(opp, "proposal")).toEqual([]);
      expect(_createTaskMock).not.toHaveBeenCalled();
    });

    it("creates tasks when entering won with no existing tasks", () => {
      const opp = makeOpp({ stage: "won", service_type: "consultoria_audit" });
      _createTaskMock.mockImplementation((input: { title: string }) => ({
        ...makeTask(),
        id: `task-${input.title}`,
        title: input.title,
      }));

      const ids = createTasksForWonOpportunity(opp, "negotiation");

      expect(ids.length).toBeGreaterThan(0);
      expect(_createTaskMock).toHaveBeenCalledTimes(ids.length);
      for (const call of _createTaskMock.mock.calls) {
        const input = call[0] as { description: string };
        expect(input.description).toContain("[Opportunity: Acme Corp]");
      }
    });

    it("skips creation when linked tasks already exist (won dedup)", () => {
      const opp = makeOpp({ stage: "won" });
      _listTasksMock.mockReturnValue([
        makeTask({ description: "[Opportunity: Acme Corp] proposal" }),
      ]);

      const ids = createTasksForWonOpportunity(opp, "negotiation");

      expect(ids).toEqual([]);
      expect(_createTaskMock).not.toHaveBeenCalled();
    });

    it("picks the right template set for audit service type", () => {
      // consultoria_audit includes "audit" → security templates branch
      const opp = makeOpp({
        stage: "won",
        service_type: "consultoria_audit",
      });
      _createTaskMock.mockImplementation((input: { title: string }) => ({
        ...makeTask(),
        id: `task-${input.title}`,
        title: input.title,
      }));

      createTasksForWonOpportunity(opp, "negotiation");

      const titles = _createTaskMock.mock.calls.map(
        (c) => (c[0] as { title: string }).title
      );
      // security templates contain "security audit"
      expect(titles.some((t) => t.includes("security audit"))).toBe(true);
    });
  });

  // ===========================================================================
  // syncStageToTaskStatuses
  // ===========================================================================
  describe("syncStageToTaskStatuses", () => {
    it("returns 0 and updates nothing when stage did not change", () => {
      const opp = makeOpp({ stage: "negotiation" });
      expect(syncStageToTaskStatuses(opp, "negotiation", _updateTaskMock)).toBe(0);
      expect(_updateTaskMock).not.toHaveBeenCalled();
    });

    it("returns 0 when the new stage is not an active stage", () => {
      const opp = makeOpp({ stage: "lead" });
      expect(syncStageToTaskStatuses(opp, "proposal", _updateTaskMock)).toBe(0);
    });

    it("updates linked non-done tasks to the new stage status", () => {
      const opp = makeOpp({ stage: "negotiation" });
      _listTasksMock.mockReturnValue([
        makeTask({ id: "t1", status: "todo" }),
        makeTask({ id: "t2", status: "review" }),
      ]);

      const count = syncStageToTaskStatuses(opp, "proposal", _updateTaskMock);

      // negotiation maps to "in_progress"; neither t1 nor t2 has that status
      // and neither is done, so both should be updated.
      expect(count).toBe(2);
      expect(_updateTaskMock).toHaveBeenCalledTimes(2);
      expect(_updateTaskMock.mock.calls[0][1]).toEqual({ status: "in_progress" });
    });

    it("does not touch tasks already done", () => {
      const opp = makeOpp({ stage: "won" });
      _listTasksMock.mockReturnValue([
        makeTask({ id: "t1", status: "done" }),
        makeTask({ id: "t2", status: "todo" }),
      ]);

      const count = syncStageToTaskStatuses(opp, "negotiation", _updateTaskMock);

      expect(count).toBe(1);
      expect(_updateTaskMock).toHaveBeenCalledTimes(1);
      expect(_updateTaskMock.mock.calls[0][0]).toBe("t2");
    });

    it("does not update tasks that already have the target status", () => {
      const opp = makeOpp({ stage: "negotiation" });
      _listTasksMock.mockReturnValue([
        makeTask({ id: "t1", status: "in_progress" }), // already target
      ]);

      const count = syncStageToTaskStatuses(opp, "proposal", _updateTaskMock);
      expect(count).toBe(0);
      expect(_updateTaskMock).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // calculateOpportunityProgress
  // ===========================================================================
  describe("calculateOpportunityProgress", () => {
    it("returns 0 when stage is not active", () => {
      const opp = makeOpp({ stage: "lead" });
      expect(calculateOpportunityProgress(opp)).toBe(0);
    });

    it("returns 0 when there are no linked tasks", () => {
      const opp = makeOpp({ stage: "proposal" });
      _listTasksMock.mockReturnValue([]);
      expect(calculateOpportunityProgress(opp)).toBe(0);
    });

    it("returns 0% when no linked tasks are done", () => {
      const opp = makeOpp({ stage: "proposal" });
      _listTasksMock.mockReturnValue([
        makeTask({ status: "todo" }),
        makeTask({ status: "in_progress" }),
      ]);
      expect(calculateOpportunityProgress(opp)).toBe(0);
    });

    it("returns 50% when half of linked tasks are done", () => {
      const opp = makeOpp({ stage: "proposal" });
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done" }),
        makeTask({ status: "todo" }),
      ]);
      expect(calculateOpportunityProgress(opp)).toBe(50);
    });

    it("returns 100% when all linked tasks are done", () => {
      const opp = makeOpp({ stage: "won" });
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done" }),
        makeTask({ status: "done" }),
      ]);
      expect(calculateOpportunityProgress(opp)).toBe(100);
    });
  });

  // ===========================================================================
  // extractOpportunityCompany
  // ===========================================================================
  describe("extractOpportunityCompany", () => {
    it("extracts company name from a linked task description", () => {
      const task = makeTask({ description: "[Opportunity: Globex Corp] task work" });
      expect(extractOpportunityCompany(task)).toBe("Globex Corp");
    });

    it("returns null when the description has no opportunity tag", () => {
      const task = makeTask({ description: "Random task description" });
      expect(extractOpportunityCompany(task)).toBeNull();
    });

    it("returns null when description is null/undefined", () => {
      const task = makeTask({ description: null });
      expect(extractOpportunityCompany(task)).toBeNull();
    });
  });

  // ===========================================================================
  // findActiveOpportunitiesByCompany
  // ===========================================================================
  describe("findActiveOpportunitiesByCompany", () => {
    it("returns active-stage opportunities matching the company", () => {
      const list = [
        makeOpp({ id: "1", company: "Acme", stage: "proposal" }),
        makeOpp({ id: "2", company: "Acme", stage: "lead" }), // not active
        makeOpp({ id: "3", company: "Globex", stage: "won" }), // other company
      ];
      const found = findActiveOpportunitiesByCompany(() => list, "Acme");
      expect(found.map((o) => o.id)).toEqual(["1"]);
    });
  });

  // ===========================================================================
  // checkStageAdvancement (reverse sync)
  // ===========================================================================
  describe("checkStageAdvancement", () => {
    it("returns [] when there are no linked tasks", () => {
      _listTasksMock.mockReturnValue([]);
      const result = checkStageAdvancement(
        "Acme",
        () => [],
        _updateTaskMock as never
      );
      expect(result).toEqual([]);
    });

    it("returns [] when not all linked tasks are done", () => {
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done" }),
        makeTask({ status: "todo" }),
      ]);
      const result = checkStageAdvancement(
        "Acme",
        () => [],
        _updateTaskMock as never
      );
      expect(result).toEqual([]);
    });

    it("advances proposal→negotiation when all tasks done", () => {
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done", description: "[Opportunity: Acme] x" }),
        makeTask({ status: "done", description: "[Opportunity: Acme] y" }),
      ]);
      const opps = [makeOpp({ id: "1", company: "Acme", stage: "proposal" })];
      const updateFn = vi.fn(() => makeOpp({ id: "1", stage: "negotiation" }));

      const advanced = checkStageAdvancement("Acme", () => opps, updateFn);

      expect(advanced).toHaveLength(1);
      expect(updateFn).toHaveBeenCalledWith("1", { stage: "negotiation", progress: 100 });
    });

    it("does not advance stages without an advancement mapping", () => {
      _listTasksMock.mockReturnValue([makeTask({ status: "done" })]);
      const opps = [makeOpp({ id: "1", company: "Acme", stage: "won" })];
      const updateFn = vi.fn();
      const advanced = checkStageAdvancement("Acme", () => opps, updateFn);
      // "won" has no next stage
      expect(advanced).toEqual([]);
      expect(updateFn).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // fullSync
  // ===========================================================================
  describe("fullSync", () => {
    it("skips opportunities in non-active stages", () => {
      const list = [
        makeOpp({ id: "1", company: "Acme", stage: "lead" }),
        makeOpp({ id: "2", company: "Acme", stage: "contacted" }),
      ];
      _listTasksMock.mockReturnValue([]);
      const updateFn = vi.fn();

      const result = fullSync(() => list, updateFn);

      expect(result.opportunities_checked).toBe(0);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it("updates progress when task completion ratio changes", () => {
      const list = [makeOpp({ id: "1", company: "Acme", stage: "proposal", progress: 0 })];
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done", description: "[Opportunity: Acme] a" }),
        makeTask({ status: "todo", description: "[Opportunity: Acme] b" }),
      ]);
      const updateFn = vi.fn();

      const result = fullSync(() => list, updateFn);

      expect(result.opportunities_checked).toBe(1);
      expect(result.progress_updated).toBe(1);
      expect(updateFn).toHaveBeenCalledWith("1", { progress: 50 });
    });

    it("advances stage when all linked tasks are done", () => {
      const list = [makeOpp({ id: "1", company: "Acme", stage: "proposal", progress: 0 })];
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done", description: "[Opportunity: Acme] a" }),
        makeTask({ status: "done", description: "[Opportunity: Acme] b" }),
      ]);
      const updateFn = vi.fn();

      const result = fullSync(() => list, updateFn);

      expect(result.stages_advanced).toBe(1);
      // Should set both stage and progress
      expect(updateFn).toHaveBeenCalledWith("1", {
        stage: "negotiation" as PipelineStage,
        progress: 100,
      });
    });

    it("does nothing when progress is unchanged and no stage advance", () => {
      const list = [makeOpp({ id: "1", company: "Acme", stage: "proposal", progress: 50 })];
      _listTasksMock.mockReturnValue([
        makeTask({ status: "done", description: "[Opportunity: Acme] a" }),
        makeTask({ status: "todo", description: "[Opportunity: Acme] b" }),
      ]);
      const updateFn = vi.fn();

      const result = fullSync(() => list, updateFn);

      expect(result.progress_updated).toBe(0);
      expect(result.stages_advanced).toBe(0);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it("ignores opportunities with no linked tasks", () => {
      const list = [makeOpp({ id: "1", company: "Acme", stage: "proposal" })];
      _listTasksMock.mockReturnValue([]);
      const updateFn = vi.fn();

      const result = fullSync(() => list, updateFn);

      expect(result.tasks_matched).toBe(0);
      expect(updateFn).not.toHaveBeenCalled();
    });
  });
});
