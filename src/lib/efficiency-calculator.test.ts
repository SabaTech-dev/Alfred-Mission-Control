import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import Database from "@/lib/sqlite-wrapper";
import {
  calculateEfficiencyScore,
  getEfficiencyHistory,
  type EfficiencyScore,
  type EfficiencyHistory,
} from "./efficiency-calculator";

// Use the same paths as the module - tests will backup/restore these files
const ACTIVITIES_DB = path.join(process.cwd(), "data", "activities.db");
const USAGE_DB = path.join(process.cwd(), "data", "usage-tracking.db");
const ACTIVITIES_BACKUP = path.join(process.cwd(), "data", "activities.db.test-backup");
const USAGE_BACKUP = path.join(process.cwd(), "data", "usage-tracking.db.test-backup");

function createActivitiesDb(): Database {
  // Delete existing DB to start fresh
  if (fs.existsSync(ACTIVITIES_DB)) {
    fs.unlinkSync(ACTIVITIES_DB);
  }

  const db = new Database(ACTIVITIES_DB);

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      duration_ms INTEGER,
      tokens_used INTEGER,
      agent TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
    CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
  `);

  return db;
}

function createUsageDb(): Database {
  // Delete existing DB to start fresh
  if (fs.existsSync(USAGE_DB)) {
    fs.unlinkSync(USAGE_DB);
  }

  const db = new Database(USAGE_DB);

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      cost REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_snapshots(date);
  `);

  return db;
}

function insertTestActivities(db: Database) {
  const now = new Date();

  const stmt = db.prepare(`
    INSERT INTO activities (id, type, description, status, timestamp, tokens_used)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert activities for today
  for (let i = 0; i < 7; i++) {
    stmt.run(
      `t${i}`,
      "file",
      `Task ${i}`,
      i < 5 ? "success" : "error", // 5 success, 2 error = 71.4% success rate
      now.toISOString(),
      100
    );
  }
}

function insertTestUsage(db: Database) {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  const stmt = db.prepare(`
    INSERT INTO usage_snapshots 
      (timestamp, date, hour, agent_id, model, input_tokens, output_tokens, total_tokens, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 7000 input, 3000 output = 30% token efficiency
  stmt.run(Date.now(), dateStr, 10, "main", "claude-sonnet", 7000, 3000, 10000, 0.1);
}

function backup() {
  try {
    if (fs.existsSync(ACTIVITIES_DB)) {
      fs.copyFileSync(ACTIVITIES_DB, ACTIVITIES_BACKUP);
      fs.unlinkSync(ACTIVITIES_DB);
    }
    if (fs.existsSync(USAGE_DB)) {
      fs.copyFileSync(USAGE_DB, USAGE_BACKUP);
      fs.unlinkSync(USAGE_DB);
    }
  } catch {
    // ignore
  }
}

function restore() {
  try {
    if (fs.existsSync(ACTIVITIES_DB)) fs.unlinkSync(ACTIVITIES_DB);
    if (fs.existsSync(USAGE_DB)) fs.unlinkSync(USAGE_DB);
    if (fs.existsSync(ACTIVITIES_BACKUP)) {
      fs.copyFileSync(ACTIVITIES_BACKUP, ACTIVITIES_DB);
      fs.unlinkSync(ACTIVITIES_BACKUP);
    }
    if (fs.existsSync(USAGE_BACKUP)) {
      fs.copyFileSync(USAGE_BACKUP, USAGE_DB);
      fs.unlinkSync(USAGE_BACKUP);
    }
  } catch {
    // ignore
  }
}

describe("efficiency-calculator", () => {
  let activitiesDb: Database | null = null;
  let usageDb: Database | null = null;

  beforeEach(() => {
    backup();
    activitiesDb = createActivitiesDb();
    usageDb = createUsageDb();
    insertTestActivities(activitiesDb);
    insertTestUsage(usageDb);
  });

  afterEach(() => {
    if (activitiesDb) activitiesDb.close();
    if (usageDb) usageDb.close();
    restore();
  });

  describe("calculateEfficiencyScore", () => {
    it("returns score with all required properties", () => {
      const result = calculateEfficiencyScore(7);

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("components");
      expect(result).toHaveProperty("breakdown");
      expect(result).toHaveProperty("trend");
      expect(result).toHaveProperty("trendPercent");
    });

    it("returns components with required properties", () => {
      const result = calculateEfficiencyScore(7);

      expect(result.components).toHaveProperty("successRate");
      expect(result.components).toHaveProperty("taskCompletion");
      expect(result.components).toHaveProperty("tokenEfficiency");
    });

    it("returns breakdown with required properties", () => {
      const result = calculateEfficiencyScore(7);

      expect(result.breakdown).toHaveProperty("totalActivities");
      expect(result.breakdown).toHaveProperty("successfulActivities");
      expect(result.breakdown).toHaveProperty("failedActivities");
      expect(result.breakdown).toHaveProperty("totalTokens");
      expect(result.breakdown).toHaveProperty("usefulTokens");
    });

    it("calculates correct activity counts", () => {
      const result = calculateEfficiencyScore(7);

      expect(result.breakdown.totalActivities).toBe(7);
      expect(result.breakdown.successfulActivities).toBe(5);
      expect(result.breakdown.failedActivities).toBe(2);
    });

    it("calculates success rate correctly", () => {
      const result = calculateEfficiencyScore(7);

      // 5/7 = 71.4%
      expect(result.components.successRate).toBeCloseTo(71.4, 0);
    });

    it("calculates task completion correctly", () => {
      const result = calculateEfficiencyScore(7);

      // 5/(5+2) = 71.4%
      expect(result.components.taskCompletion).toBeCloseTo(71.4, 0);
    });

    it("calculates token efficiency correctly", () => {
      const result = calculateEfficiencyScore(7);

      // 3000/10000 = 30%
      expect(result.components.tokenEfficiency).toBeCloseTo(30, 0);
    });

    it("assigns grade A for score >= 90", () => {
      activitiesDb!.exec("DELETE FROM activities");

      // Insert only successful activities
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        activitiesDb!.prepare(
          "INSERT INTO activities (id, type, description, status, timestamp) VALUES (?, 'file', 'test', 'success', ?)"
        ).run(`grade-a-${i}`, now.toISOString());
      }

      // Also insert usage data with high output ratio (80% output = high token efficiency)
      const dateStr = now.toISOString().split("T")[0];
      usageDb!.exec("DELETE FROM usage_snapshots");
      usageDb!.prepare(`
        INSERT INTO usage_snapshots 
          (timestamp, date, hour, agent_id, model, input_tokens, output_tokens, total_tokens, cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(Date.now(), dateStr, 10, "main", "claude-sonnet", 2000, 8000, 10000, 0.1);

      const result = calculateEfficiencyScore(7);
      // With 100% success rate, 100% task completion, and 80% token efficiency:
      // (100 * 0.4) + (100 * 0.4) + (80 * 0.2) = 40 + 40 + 16 = 96
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.grade).toBe("A");
    });

    it("assigns grade F for low score", () => {
      activitiesDb!.exec("DELETE FROM activities");

      // Insert only errors
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        activitiesDb!.prepare(
          "INSERT INTO activities (id, type, description, status, timestamp) VALUES (?, 'file', 'test', 'error', ?)"
        ).run(`grade-f-${i}`, now.toISOString());
      }

      const result = calculateEfficiencyScore(7);
      expect(result.grade).toBe("F");
    });

    it("calculates trend", () => {
      const result = calculateEfficiencyScore(7);
      expect(["up", "down", "stable"]).toContain(result.trend);
    });

    it("handles empty database gracefully", () => {
      activitiesDb!.exec("DELETE FROM activities");
      usageDb!.exec("DELETE FROM usage_snapshots");

      const result = calculateEfficiencyScore(7);

      expect(result.score).toBe(0);
      expect(result.grade).toBe("F");
      expect(result.breakdown.totalActivities).toBe(0);
    });

    it("handles missing usage database", () => {
      usageDb!.close();
      fs.unlinkSync(USAGE_DB);
      usageDb = null;

      const result = calculateEfficiencyScore(7);

      expect(result.breakdown.totalTokens).toBe(0);
      expect(result.components.tokenEfficiency).toBe(0);
    });

    it("score is a number between 0 and 100", () => {
      const result = calculateEfficiencyScore(7);

      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("trendPercent is a number", () => {
      const result = calculateEfficiencyScore(7);

      expect(typeof result.trendPercent).toBe("number");
      expect(result.trendPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getEfficiencyHistory", () => {
    it("returns an array", () => {
      const result = getEfficiencyHistory(7);
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when no activities exist", () => {
      activitiesDb!.exec("DELETE FROM activities");

      const result = getEfficiencyHistory(7);
      expect(result).toEqual([]);
    });

    it("returns history entries with required properties", () => {
      const result = getEfficiencyHistory(7);

      if (result.length > 0) {
        const entry = result[0];
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("score");
        expect(entry).toHaveProperty("activities");
        expect(entry).toHaveProperty("successRate");
      }
    });

    it("formats dates as MM-DD", () => {
      const result = getEfficiencyHistory(7);

      if (result.length > 0) {
        // MM-DD format is at most 5 characters (e.g., "01-15")
        expect(result[0].date.length).toBeLessThanOrEqual(5);
      }
    });

    it("sorts history by date ascending", () => {
      const result = getEfficiencyHistory(7);

      if (result.length >= 2) {
        const dates = result.map((r) => r.date);
        const sorted = [...dates].sort();
        expect(dates).toEqual(sorted);
      }
    });

    it("calculates daily success rate correctly", () => {
      const result = getEfficiencyHistory(7);

      if (result.length > 0) {
        const entry = result[0];
        // 5/7 = 71.4%
        expect(entry.successRate).toBeCloseTo(71.4, 0);
        expect(entry.activities).toBe(7);
      }
    });
  });

  describe("EfficiencyScore type", () => {
    it("has valid grade values", () => {
      const validGrades: EfficiencyScore["grade"][] = [
        "A",
        "B",
        "C",
        "D",
        "F",
      ];

      // Just verify the type compiles and values are valid
      expect(validGrades).toContain("A");
      expect(validGrades).toContain("B");
      expect(validGrades).toContain("F");
    });

    it("has valid trend values", () => {
      const validTrends: EfficiencyScore["trend"][] = ["up", "down", "stable"];

      // Just verify the type compiles and values are valid
      expect(validTrends).toContain("up");
      expect(validTrends).toContain("down");
      expect(validTrends).toContain("stable");
    });
  });

  describe("EfficiencyHistory type", () => {
    it("has correct property types", () => {
      const entry: EfficiencyHistory = {
        date: "01-15",
        score: 85.5,
        activities: 10,
        successRate: 90.0,
      };

      expect(typeof entry.date).toBe("string");
      expect(typeof entry.score).toBe("number");
      expect(typeof entry.activities).toBe("number");
      expect(typeof entry.successRate).toBe("number");
    });
  });
});
