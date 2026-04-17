import fs from "fs";
import path from "path";

import Database from "better-sqlite3";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "usage-tracking.db");

interface SummaryRow {
  total: number | null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDays(baseDate: Date, offset: number): Date {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + offset);
  return nextDate;
}

function getMonthBounds(baseDate: Date): { start: string; end: string; daysInMonth: number } {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return {
    start: isoDate(startDate),
    end: isoDate(endDate),
    daysInMonth: endDate.getDate(),
  };
}

function sumCostBetween(db: Database.Database, start: string, end: string): number {
  const result = db.prepare(`
    SELECT COALESCE(SUM(cost), 0) AS total
    FROM usage_snapshots
    WHERE date >= ? AND date <= ?
  `).get(start, end) as SummaryRow;

  return result.total ?? 0;
}

export function getDatabase(dbPath: string = DEFAULT_DB_PATH): Database.Database | null {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  return new Database(dbPath, { readonly: true });
}

export function getCostSummary(db: Database.Database) {
  const today = new Date();
  const todayDate = isoDate(today);
  const yesterdayDate = isoDate(shiftDays(today, -1));

  const thisMonth = getMonthBounds(today);
  const lastMonthReference = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = getMonthBounds(lastMonthReference);

  const todayCost = sumCostBetween(db, todayDate, todayDate);
  const yesterdayCost = sumCostBetween(db, yesterdayDate, yesterdayDate);
  const thisMonthCost = sumCostBetween(db, thisMonth.start, thisMonth.end);
  const lastMonthCost = sumCostBetween(db, lastMonth.start, lastMonth.end);

  const elapsedDays = Math.max(1, today.getDate());
  const projected = (thisMonthCost / elapsedDays) * thisMonth.daysInMonth;

  return {
    today: todayCost,
    yesterday: yesterdayCost,
    thisMonth: thisMonthCost,
    lastMonth: lastMonthCost,
    projected,
  };
}

export function getCostByAgent(db: Database.Database, days: number) {
  const startDate = isoDate(shiftDays(new Date(), -(Math.max(days, 1) - 1)));
  const rows = db.prepare(`
    SELECT
      agent_id AS agent,
      COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(total_tokens), 0) AS tokens
    FROM usage_snapshots
    WHERE date >= ?
    GROUP BY agent_id
    ORDER BY cost DESC, agent ASC
  `).all(startDate) as Array<{ agent: string; cost: number; tokens: number }>;

  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  return rows.map((row) => ({
    ...row,
    percentOfTotal: totalCost > 0 ? (row.cost / totalCost) * 100 : 0,
  }));
}

export function getCostByModel(db: Database.Database, days: number) {
  const startDate = isoDate(shiftDays(new Date(), -(Math.max(days, 1) - 1)));
  const rows = db.prepare(`
    SELECT
      model,
      COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(total_tokens), 0) AS tokens
    FROM usage_snapshots
    WHERE date >= ?
    GROUP BY model
    ORDER BY cost DESC, model ASC
  `).all(startDate) as Array<{ model: string; cost: number; tokens: number }>;

  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  return rows.map((row) => ({
    ...row,
    percentOfTotal: totalCost > 0 ? (row.cost / totalCost) * 100 : 0,
  }));
}

export function getDailyCost(db: Database.Database, days: number) {
  const startDate = isoDate(shiftDays(new Date(), -(Math.max(days, 1) - 1)));
  const rows = db.prepare(`
    SELECT
      date,
      COALESCE(SUM(cost), 0) AS cost,
      COALESCE(SUM(input_tokens), 0) AS input,
      COALESCE(SUM(output_tokens), 0) AS output
    FROM usage_snapshots
    WHERE date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(startDate) as Array<{ date: string; cost: number; input: number; output: number }>;

  return rows.map((row) => ({
    ...row,
    date: row.date.slice(5),
  }));
}

export function getHourlyCost(db: Database.Database) {
  return db.prepare(`
    SELECT
      printf('%02d:00', hour) AS hour,
      COALESCE(SUM(cost), 0) AS cost
    FROM usage_snapshots
    GROUP BY hour
    ORDER BY hour ASC
  `).all() as Array<{ hour: string; cost: number }>;
}