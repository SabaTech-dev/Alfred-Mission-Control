import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "@/lib/sqlite-wrapper";
import fs from "fs";
import path from "path";
import {
  getDatabase,
  getCostSummary,
  getCostByAgent,
  getCostByModel,
  getDailyCost,
  getHourlyCost,
} from "./usage-queries";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-usage.db");
const DATA_DIR = path.join(process.cwd(), "data");

// Helper to create test database with sample data
function createTestDb(): Database {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(TEST_DB_PATH);

  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0
    )
  `);

  return db;
}

// Helper to insert test data
function insertTestData(db: Database) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const stmt = db.prepare(`
    INSERT INTO usage_snapshots (date, hour, timestamp, agent_id, model, input_tokens, output_tokens, total_tokens, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert today's data
  stmt.run(today, 10, Date.now(), "main", "claude-sonnet-4", 1000, 500, 1500, 0.05);
  stmt.run(today, 11, Date.now(), "main", "claude-sonnet-4", 2000, 1000, 3000, 0.10);
  stmt.run(today, 12, Date.now(), "infra", "claude-haiku-3", 500, 200, 700, 0.01);

  // Insert yesterday's data
  stmt.run(yesterdayStr, 10, Date.now() - 86400000, "main", "claude-sonnet-4", 1500, 800, 2300, 0.08);
}

function cleanup() {
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch {
    // ignore
  }
}

describe("usage-queries", () => {
  let db: Database;

  beforeEach(() => {
    cleanup();
    db = createTestDb();
    insertTestData(db);
  });

  afterEach(() => {
    db.close();
    cleanup();
  });

  describe("getDatabase", () => {
    it("returns null when database doesn't exist", () => {
      const result = getDatabase("/non/existent/path.db");
      expect(result).toBeNull();
    });

    it("returns database when it exists", () => {
      // The test DB exists at this point
      const result = getDatabase(TEST_DB_PATH);
      expect(result).not.toBeNull();
      result?.close();
    });
  });

  describe("getCostSummary", () => {
    it("returns cost summary with correct structure", () => {
      const summary = getCostSummary(db);

      expect(summary).toHaveProperty("today");
      expect(summary).toHaveProperty("yesterday");
      expect(summary).toHaveProperty("thisMonth");
      expect(summary).toHaveProperty("lastMonth");
      expect(summary).toHaveProperty("projected");
    });

    it("calculates today's cost correctly", () => {
      const summary = getCostSummary(db);
      // 0.05 + 0.10 + 0.01 = 0.16
      expect(summary.today).toBeCloseTo(0.16, 2);
    });

    it("calculates yesterday's cost correctly", () => {
      const summary = getCostSummary(db);
      expect(summary.yesterday).toBeCloseTo(0.08, 2);
    });

    it("calculates projected cost", () => {
      const summary = getCostSummary(db);
      expect(summary.projected).toBeGreaterThan(0);
    });
  });

  describe("getCostByAgent", () => {
    it("returns cost breakdown by agent", () => {
      const results = getCostByAgent(db, 30);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("agent");
      expect(results[0]).toHaveProperty("cost");
      expect(results[0]).toHaveProperty("tokens");
      expect(results[0]).toHaveProperty("percentOfTotal");
    });

    it("sorts by cost descending", () => {
      const results = getCostByAgent(db, 30);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].cost).toBeGreaterThanOrEqual(results[i].cost);
      }
    });

    it("calculates percent of total correctly", () => {
      const results = getCostByAgent(db, 30);
      const totalPercent = results.reduce((sum, r) => sum + r.percentOfTotal, 0);

      expect(totalPercent).toBeCloseTo(100, 1);
    });
  });

  describe("getCostByModel", () => {
    it("returns cost breakdown by model", () => {
      const results = getCostByModel(db, 30);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("model");
      expect(results[0]).toHaveProperty("cost");
      expect(results[0]).toHaveProperty("tokens");
      expect(results[0]).toHaveProperty("percentOfTotal");
    });

    it("sorts by cost descending", () => {
      const results = getCostByModel(db, 30);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].cost).toBeGreaterThanOrEqual(results[i].cost);
      }
    });
  });

  describe("getDailyCost", () => {
    it("returns daily cost trend", () => {
      const results = getDailyCost(db, 30);

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("date");
        expect(results[0]).toHaveProperty("cost");
        expect(results[0]).toHaveProperty("input");
        expect(results[0]).toHaveProperty("output");
      }
    });

    it("formats date as MM-DD", () => {
      const results = getDailyCost(db, 30);

      if (results.length > 0) {
        // MM-DD format: 5 characters max (e.g., "01-15")
        expect(results[0].date.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("getHourlyCost", () => {
    it("returns hourly cost trend", () => {
      const results = getHourlyCost(db);

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("hour");
        expect(results[0]).toHaveProperty("cost");
      }
    });

    it("formats hour as HH:00", () => {
      const results = getHourlyCost(db);

      if (results.length > 0) {
        expect(results[0].hour).toMatch(/^\d{2}:00$/);
      }
    });
  });
});
