// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the native SQLite binding with an in-memory mini-SQL engine.
// better-sqlite3 cannot be loaded inside the jsdom test environment, so we
// substitute a deterministic JS implementation that understands the subset
// of SQL emitted by pipeline-db.
vi.mock("@/lib/sqlite-wrapper", async () => {
  const mod = await import("../../tests/helpers/sqlite-mock");
  return mod.createSqliteWrapperMock();
});

// Mock the kanban-bridge side-effects so we can test pipeline-db in isolation.
// Default: empty arrays, no-op functions. Individual tests can override.
vi.mock("@/lib/pipeline-kanban-bridge", () => ({
  shouldCreateProposalTasks: () => false,
  shouldCreateTasksForOpportunity: () => false,
  createTasksForProposalStage: () => [],
  createTasksForWonOpportunity: () => [],
  syncStageToTaskStatuses: () => 0,
  calculateOpportunityProgress: () => 0,
}));

// activities-db also imports the native sqlite binding transitively.
// We don't care about activity logging in pipeline-db unit tests.
vi.mock("@/lib/activities-db", () => ({
  logActivity: () => undefined,
  resetDbForTesting: () => undefined,
}));

import {
  createOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  deleteOpportunity,
  findOpportunityByCompany,
  findOpportunityByCompanyTitle,
  getPipelineKPIs,
  clearAllPipelineDataForTesting,
  type CreateOpportunityInput,
} from "./pipeline-db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseInput(overrides: Partial<CreateOpportunityInput> = {}): CreateOpportunityInput {
  return {
    company: "Acme Corp",
    title: "QA Framework Setup",
    value: 10000,
    ...overrides,
  };
}

describe("pipeline-db", () => {
  beforeEach(() => {
    clearAllPipelineDataForTesting();
  });

  afterEach(() => {
    clearAllPipelineDataForTesting();
  });

  // ===========================================================================
  // createOpportunity
  // ===========================================================================
  describe("createOpportunity", () => {
    it("creates an opportunity with required fields and defaults", () => {
      const opp = createOpportunity(baseInput());

      expect(opp.id).toBeTruthy();
      expect(opp.company).toBe("Acme Corp");
      expect(opp.title).toBe("QA Framework Setup");
      expect(opp.value).toBe(10000);
      // Defaults
      expect(opp.stage).toBe("lead");
      expect(opp.currency).toBe("EUR");
      expect(opp.service_type).toBe("other");
      expect(opp.source_type).toBe("auto_sync");
      expect(opp.probability).toBeNull();
      expect(opp.contact_name).toBeNull();
      expect(opp.description).toBeNull();
      expect(opp.progress).toBe(0);
      expect(opp.closed_at).toBeNull();
      // Timestamps
      expect(opp.created_at).toBeTruthy();
      expect(opp.updated_at).toBeTruthy();
    });

    it("accepts all optional fields when provided", () => {
      const opp = createOpportunity(
        baseInput({
          contact_name: "Jane Doe",
          contact_email: "jane@acme.com",
          contact_linkedin: "https://linkedin.com/in/jane",
          description: "Big audit engagement",
          stage: "proposal",
          currency: "USD",
          service_type: "consultoria_audit",
          probability: 0.5,
          source: "lead-scraper",
          source_type: "manual",
          next_action: "Send proposal",
          next_action_date: "2026-07-01",
          notes: "High priority",
        })
      );

      expect(opp.contact_name).toBe("Jane Doe");
      expect(opp.contact_email).toBe("jane@acme.com");
      expect(opp.contact_linkedin).toBe("https://linkedin.com/in/jane");
      expect(opp.description).toBe("Big audit engagement");
      expect(opp.stage).toBe("proposal");
      expect(opp.currency).toBe("USD");
      expect(opp.service_type).toBe("consultoria_audit");
      expect(opp.probability).toBe(0.5);
      expect(opp.source).toBe("lead-scraper");
      expect(opp.source_type).toBe("manual");
      expect(opp.next_action).toBe("Send proposal");
      expect(opp.next_action_date).toBe("2026-07-01");
      expect(opp.notes).toBe("High priority");
    });

    it("rejects NULL for required fields (NOT NULL constraint)", () => {
      // The DB schema declares company & title as NOT NULL. Forcing null past
      // TypeScript simulates a broken caller and the mock engine must reject
      // the insert rather than silently storing null. Validation of empty
      // strings is the responsibility of the API layer (Zod schema).
      const broken = baseInput();
      (broken as unknown as { company: string }).company = null as unknown as string;
      expect(() => createOpportunity(broken)).toThrow();
    });

    it("generates a unique UUID id per opportunity", () => {
      const a = createOpportunity(baseInput());
      const b = createOpportunity(baseInput({ title: "Other" }));
      expect(a.id).not.toBe(b.id);
    });
  });

  // ===========================================================================
  // getOpportunity
  // ===========================================================================
  describe("getOpportunity", () => {
    it("returns the opportunity when it exists", () => {
      const created = createOpportunity(baseInput());
      const fetched = getOpportunity(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.company).toBe("Acme Corp");
    });

    it("returns null when the opportunity does not exist", () => {
      const fetched = getOpportunity("00000000-0000-0000-0000-000000000000");
      expect(fetched).toBeNull();
    });
  });

  // ===========================================================================
  // listOpportunities
  // ===========================================================================
  describe("listOpportunities", () => {
    it("returns an empty array when no opportunities exist", () => {
      expect(listOpportunities()).toEqual([]);
    });

    it("returns all opportunities ordered by created_at DESC", async () => {
      const a = createOpportunity(baseInput({ company: "First" }));
      // Small delay so timestamps differ
      await new Promise((r) => setTimeout(r, 10));
      const b = createOpportunity(baseInput({ company: "Second" }));

      const list = listOpportunities();
      expect(list).toHaveLength(2);
      // Most-recent first (Second was created after First)
      expect(list[0].id).toBe(b.id);
      expect(list[1].id).toBe(a.id);
    });
  });

  // ===========================================================================
  // updateOpportunity
  // ===========================================================================
  describe("updateOpportunity", () => {
    it("updates a single field", () => {
      const created = createOpportunity(baseInput());
      const updated = updateOpportunity(created.id, { value: 25000 });
      expect(updated).not.toBeNull();
      expect(updated!.value).toBe(25000);
      expect(updated!.company).toBe("Acme Corp");
    });

    it("updates multiple fields at once", () => {
      const created = createOpportunity(baseInput());
      const updated = updateOpportunity(created.id, {
        company: "Globex",
        title: "New Deal",
        stage: "contacted",
        value: 5000,
      });
      expect(updated!.company).toBe("Globex");
      expect(updated!.title).toBe("New Deal");
      expect(updated!.stage).toBe("contacted");
      expect(updated!.value).toBe(5000);
    });

    it("returns null when the opportunity does not exist", () => {
      const updated = updateOpportunity("nonexistent-id", { value: 100 });
      expect(updated).toBeNull();
    });

    it("sets closed_at when stage changes to won", () => {
      const created = createOpportunity(baseInput());
      const updated = updateOpportunity(created.id, { stage: "won" });
      expect(updated!.stage).toBe("won");
      expect(updated!.closed_at).not.toBeNull();
    });

    it("sets closed_at when stage changes to lost", () => {
      const created = createOpportunity(baseInput());
      const updated = updateOpportunity(created.id, { stage: "lost" });
      expect(updated!.stage).toBe("lost");
      expect(updated!.closed_at).not.toBeNull();
    });

    it("clears closed_at when stage changes away from won/lost", () => {
      const won = createOpportunity(baseInput({ stage: "won" }));
      // Force closed_at via update first
      const withClosed = updateOpportunity(won.id, { stage: "won" });
      expect(withClosed!.closed_at).not.toBeNull();

      const reopened = updateOpportunity(won.id, { stage: "negotiation" });
      expect(reopened!.stage).toBe("negotiation");
      expect(reopened!.closed_at).toBeNull();
    });

    it("refreshes updated_at on every change", async () => {
      const created = createOpportunity(baseInput());
      const before = created.updated_at;
      await new Promise((r) => setTimeout(r, 10));
      const updated = updateOpportunity(created.id, { value: 1 });
      expect(updated!.updated_at).not.toBe(before);
    });

    it("ignores unknown columns (whitelist enforcement)", () => {
      const created = createOpportunity(baseInput());
      // Inject a malicious key that is NOT in ALLOWED_UPDATE_COLUMNS.
      // Should be silently dropped — not appended to the SQL statement.
      const poisonedInput = {
        value: 999,
        malicious_column: "DROP TABLE opportunities",
      } as unknown as Parameters<typeof updateOpportunity>[1];
      const updated = updateOpportunity(created.id, poisonedInput);
      expect(updated).not.toBeNull();
      expect(updated!.value).toBe(999);
      // Row still exists after attempting injection
      expect(getOpportunity(created.id)).not.toBeNull();
    });
  });

  // ===========================================================================
  // deleteOpportunity
  // ===========================================================================
  describe("deleteOpportunity", () => {
    it("deletes an existing opportunity and returns true", () => {
      const created = createOpportunity(baseInput());
      const ok = deleteOpportunity(created.id);
      expect(ok).toBe(true);
      expect(getOpportunity(created.id)).toBeNull();
    });

    it("returns false when the opportunity does not exist", () => {
      const ok = deleteOpportunity("does-not-exist");
      expect(ok).toBe(false);
    });
  });

  // ===========================================================================
  // findOpportunityByCompanyTitle / findOpportunityByCompany
  // ===========================================================================
  describe("findOpportunityByCompanyTitle", () => {
    it("matches case-insensitively and trims whitespace", () => {
      createOpportunity(baseInput({ company: "  Acme Corp  ", title: "  QA Framework  " }));
      const found = findOpportunityByCompanyTitle("  acme corp ", " qa framework ");
      expect(found).not.toBeNull();
      expect(found!.company).toBe("  Acme Corp  ");
    });

    it("returns null when no match", () => {
      createOpportunity(baseInput());
      const found = findOpportunityByCompanyTitle("Globex", "QA Framework Setup");
      expect(found).toBeNull();
    });

    it("returns the first match when duplicates exist", () => {
      const a = createOpportunity(baseInput());
      const b = createOpportunity(baseInput());
      const found = findOpportunityByCompanyTitle("Acme Corp", "QA Framework Setup");
      expect(found).not.toBeNull();
      expect([a.id, b.id]).toContain(found!.id);
    });
  });

  describe("findOpportunityByCompany", () => {
    it("matches case-insensitively by company only", () => {
      createOpportunity(baseInput({ company: "Acme Corp", title: "Title A" }));
      const found = findOpportunityByCompany("ACME CORP");
      expect(found).not.toBeNull();
      expect(found!.company).toBe("Acme Corp");
    });

    it("trims whitespace before matching", () => {
      createOpportunity(baseInput({ company: "  Globex  " }));
      const found = findOpportunityByCompany("   globex   ");
      expect(found).not.toBeNull();
    });

    it("returns null when no match", () => {
      expect(findOpportunityByCompany("Nobody")).toBeNull();
    });
  });

  // ===========================================================================
  // SQL Injection hardening
  // ===========================================================================
  describe("SQL injection hardening", () => {
    it("parameterizes company and title in createOpportunity", () => {
      // If input were concatenated into SQL, the quote would terminate the string
      // and cause a syntax error or unwanted behaviour. Parameterization keeps
      // the literal value intact.
      const payload = `Acme'); DROP TABLE opportunities;--`;
      const opp = createOpportunity(baseInput({ company: payload, title: payload }));
      expect(opp.company).toBe(payload);
      // Table still exists
      expect(listOpportunities()).toHaveLength(1);
    });

    it("parameterizes values in updateOpportunity", () => {
      const created = createOpportunity(baseInput());
      const malicious = `Acme'; UPDATE opportunities SET value=999999 WHERE '1'='1`;
      const updated = updateOpportunity(created.id, { company: malicious });
      expect(updated!.company).toBe(malicious);
      // Other rows untouched
      const fetched = getOpportunity(created.id);
      expect(fetched!.value).toBe(10000);
    });

    it("parameterizes lookup in findOpportunityByCompanyTitle", () => {
      createOpportunity(baseInput());
      const malicious = `x' OR '1'='1`;
      const found = findOpportunityByCompanyTitle(malicious, malicious);
      expect(found).toBeNull();
    });

    it("parameterizes lookup in findOpportunityByCompany", () => {
      createOpportunity(baseInput());
      const malicious = `x' OR '1'='1`;
      const found = findOpportunityByCompany(malicious);
      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // getPipelineKPIs
  // ===========================================================================
  describe("getPipelineKPIs", () => {
    it("returns zero KPIs when no opportunities exist", () => {
      const kpis = getPipelineKPIs();
      expect(kpis.total_opportunities).toBe(0);
      expect(kpis.total_pipeline_value).toBe(0);
      expect(kpis.weighted_pipeline_value).toBe(0);
      expect(kpis.won_value).toBe(0);
      expect(kpis.lost_value).toBe(0);
      expect(kpis.avg_deal_size).toBe(0);
      expect(kpis.win_rate).toBe(0);
    });

    it("sums total pipeline value (excludes won/lost)", () => {
      createOpportunity(baseInput({ company: "A", value: 1000, stage: "lead" }));
      createOpportunity(baseInput({ company: "B", value: 2000, stage: "qualifying" }));
      createOpportunity(baseInput({ company: "W", value: 5000, stage: "won" }));
      createOpportunity(baseInput({ company: "L", value: 3000, stage: "lost" }));

      const kpis = getPipelineKPIs();
      expect(kpis.total_pipeline_value).toBe(3000); // 1000 + 2000
      expect(kpis.won_value).toBe(5000);
      expect(kpis.lost_value).toBe(3000);
    });

    it("uses STAGE_PROBABILITY when no explicit probability is set", () => {
      // lead=0.1, qualifying=0.35
      createOpportunity(baseInput({ company: "A", value: 1000, stage: "lead" }));
      createOpportunity(baseInput({ company: "B", value: 2000, stage: "qualifying" }));

      const kpis = getPipelineKPIs();
      // 1000 * 0.1 + 2000 * 0.35 = 100 + 700 = 800
      expect(kpis.weighted_pipeline_value).toBeCloseTo(800, 5);
    });

    it("uses explicit probability when provided", () => {
      createOpportunity(
        baseInput({ company: "A", value: 1000, stage: "lead", probability: 0.9 })
      );
      const kpis = getPipelineKPIs();
      // 1000 * 0.9 = 900
      expect(kpis.weighted_pipeline_value).toBeCloseTo(900, 5);
    });

    it("computes win_rate as won / (won + lost)", () => {
      createOpportunity(baseInput({ company: "W1", value: 1000, stage: "won" }));
      createOpportunity(baseInput({ company: "W2", value: 1000, stage: "won" }));
      createOpportunity(baseInput({ company: "L1", value: 1000, stage: "lost" }));

      const kpis = getPipelineKPIs();
      // 2 won / (2 won + 1 lost) = 0.666...
      expect(kpis.win_rate).toBeCloseTo(2 / 3, 5);
    });

    it("computes avg_deal_size across all opportunities", () => {
      createOpportunity(baseInput({ company: "A", value: 3000, stage: "lead" }));
      createOpportunity(baseInput({ company: "B", value: 6000, stage: "won" }));
      createOpportunity(baseInput({ company: "C", value: 3000, stage: "lost" }));

      const kpis = getPipelineKPIs();
      // (3000 + 6000 + 3000) / 3 = 4000
      expect(kpis.avg_deal_size).toBeCloseTo(4000, 5);
    });

    it("reports per-stage counts and values in by_stage", () => {
      createOpportunity(baseInput({ company: "A", value: 1000, stage: "lead" }));
      createOpportunity(baseInput({ company: "B", value: 2000, stage: "lead" }));
      createOpportunity(baseInput({ company: "C", value: 5000, stage: "won" }));

      const kpis = getPipelineKPIs();
      expect(kpis.by_stage.lead.count).toBe(2);
      expect(kpis.by_stage.lead.value).toBe(3000);
      // lead probability = 0.1, weighted = 3000 * 0.1 = 300
      expect(kpis.by_stage.lead.weighted).toBeCloseTo(300, 5);
      expect(kpis.by_stage.won.count).toBe(1);
      expect(kpis.by_stage.won.value).toBe(5000);
    });

    it("includes all stages in by_stage even when empty", () => {
      const kpis = getPipelineKPIs();
      for (const stage of [
        "lead",
        "contacted",
        "qualifying",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "done",
      ] as const) {
        expect(kpis.by_stage[stage]).toBeDefined();
        expect(kpis.by_stage[stage].count).toBe(0);
        expect(kpis.by_stage[stage].value).toBe(0);
      }
    });
  });
});
