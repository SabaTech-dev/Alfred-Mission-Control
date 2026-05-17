import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";

const execAsync = promisify(exec);

interface DailyUsage {
  date: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

interface AgentUsage {
  agent: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  percentage: number;
}

export async function GET() {
  try {
    // Try to read config for budget
    const configPath = path.join(process.cwd(), "data", "cost-alerts-config.json");
    let config = { monthlyBudget: 50, alerts: { warning: 40, critical: 80 } };
    
    try {
      const configData = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(configData);
    } catch {
      // Config doesn't exist, use defaults
    }

    // Generate sample usage data
    // In production, this would come from actual usage tracking
    const today = new Date();
    const dailyUsage: DailyUsage[] = [];
    
    // Generate 7 days of sample data
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const tokensIn = Math.floor(Math.random() * 50000) + 10000;
      const tokensOut = Math.floor(Math.random() * 30000) + 5000;
      // Rough cost estimate: $0.0005 per 1K tokens in, $0.0015 per 1K tokens out
      const cost = (tokensIn * 0.0000005) + (tokensOut * 0.0000015);
      
      dailyUsage.push({
        date: date.toISOString().split("T")[0],
        tokensIn,
        tokensOut,
        cost: Math.round(cost * 100) / 100,
      });
    }

    // Agent breakdown
    const agentUsage: AgentUsage[] = [
      { agent: "Alfred", tokensIn: 125000, tokensOut: 45000, cost: 1.25, percentage: 35 },
      { agent: "coder", tokensIn: 98000, tokensOut: 52000, cost: 1.05, percentage: 30 },
      { agent: "research", tokensIn: 65000, tokensOut: 28000, cost: 0.65, percentage: 18 },
      { agent: "security", tokensIn: 42000, tokensOut: 18000, cost: 0.42, percentage: 12 },
      { agent: "devops", tokensIn: 18000, tokensOut: 8000, cost: 0.18, percentage: 5 },
    ];

    const totalCost = agentUsage.reduce((sum, a) => sum + a.cost, 0);
    const todayUsage = dailyUsage[dailyUsage.length - 1];
    const budgetUsed = Math.round((totalCost / config.monthlyBudget) * 100);

    // Generate alerts based on thresholds
    const alerts: Array<{
      level: "ok" | "warning" | "critical";
      message: string;
      value: number;
      threshold: number;
    }> = [];

    if (budgetUsed >= config.alerts.critical) {
      alerts.push({
        level: "critical",
        message: `Budget usage critical: ${budgetUsed}% used`,
        value: budgetUsed,
        threshold: config.alerts.critical,
      });
    } else if (budgetUsed >= config.alerts.warning) {
      alerts.push({
        level: "warning",
        message: `Budget warning: ${budgetUsed}% used`,
        value: budgetUsed,
        threshold: config.alerts.warning,
      });
    } else {
      alerts.push({
        level: "ok",
        message: `Budget OK: ${budgetUsed}% used`,
        value: budgetUsed,
        threshold: config.alerts.warning,
      });
    }

    return NextResponse.json({
      today: todayUsage,
      weekly: dailyUsage,
      byAgent: agentUsage,
      totalCost: Math.round(totalCost * 100) / 100,
      budget: config.monthlyBudget,
      budgetUsed,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching usage data:", error);
    return NextResponse.json({
      today: { date: new Date().toISOString().split("T")[0], tokensIn: 0, tokensOut: 0, cost: 0 },
      weekly: [],
      byAgent: [],
      totalCost: 0,
      budget: 50,
      budgetUsed: 0,
      alerts: [{ level: "ok", message: "Budget OK: 0% used", value: 0, threshold: 40 }],
      timestamp: new Date().toISOString(),
      error: "Unable to fetch usage data",
    });
  }
}
