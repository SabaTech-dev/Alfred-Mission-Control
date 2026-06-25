import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_PROBABILITY,
  type PipelineStage,
} from "@/lib/pipeline-types";

describe("pipeline-types", () => {
  describe("PIPELINE_STAGES", () => {
    it("contains all expected stages", () => {
      const expected: PipelineStage[] = [
        "lead", "contacted", "qualifying", "proposal",
        "negotiation", "won", "lost", "done",
      ];
      expect(PIPELINE_STAGES).toEqual(expected);
      expect(PIPELINE_STAGES).toHaveLength(8);
    });

    it("has no duplicates", () => {
      expect(new Set(PIPELINE_STAGES).size).toBe(PIPELINE_STAGES.length);
    });
  });

  describe("STAGE_LABELS", () => {
    it("has a label for every stage", () => {
      for (const stage of PIPELINE_STAGES) {
        expect(STAGE_LABELS[stage]).toBeDefined();
        expect(typeof STAGE_LABELS[stage]).toBe("string");
        expect(STAGE_LABELS[stage].length).toBeGreaterThan(0);
      }
    });
  });

  describe("STAGE_COLORS", () => {
    it("has a color for every stage", () => {
      for (const stage of PIPELINE_STAGES) {
        expect(STAGE_COLORS[stage]).toBeDefined();
        // CSS color format (hex)
        expect(STAGE_COLORS[stage]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe("STAGE_PROBABILITY", () => {
    it("has a probability for every stage", () => {
      for (const stage of PIPELINE_STAGES) {
        expect(STAGE_PROBABILITY[stage]).toBeDefined();
        expect(STAGE_PROBABILITY[stage]).toBeGreaterThanOrEqual(0);
        expect(STAGE_PROBABILITY[stage]).toBeLessThanOrEqual(1);
      }
    });

    it("lost stage has 0 probability", () => {
      expect(STAGE_PROBABILITY.lost).toBe(0);
    });

    it("won and done stages have 100% probability", () => {
      expect(STAGE_PROBABILITY.won).toBe(1);
      expect(STAGE_PROBABILITY.done).toBe(1);
    });

    it("progresses monotonically (lead→contacted→...→won)", () => {
      const activeStages: PipelineStage[] = [
        "lead", "contacted", "qualifying", "proposal", "negotiation", "won",
      ];
      for (let i = 1; i < activeStages.length; i++) {
        expect(STAGE_PROBABILITY[activeStages[i]]).toBeGreaterThan(
          STAGE_PROBABILITY[activeStages[i - 1]]
        );
      }
    });
  });
});
