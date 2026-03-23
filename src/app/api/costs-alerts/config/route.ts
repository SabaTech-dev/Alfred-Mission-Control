import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface CostAlertConfig {
  monthlyBudget: number;
  alerts: {
    warning: number;
    critical: number;
  };
  lastUpdated: string;
}

const CONFIG_PATH = path.join(process.cwd(), "data", "cost-alerts-config.json");

const DEFAULT_CONFIG: CostAlertConfig = {
  monthlyBudget: 50,
  alerts: {
    warning: 40,
    critical: 80,
  },
  lastUpdated: new Date().toISOString(),
};

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {
    // Directory exists
  }
}

export async function GET() {
  try {
    const configData = await fs.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(configData);
    return NextResponse.json(config);
  } catch {
    // Config doesn't exist, return defaults
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureDataDir();
    
    const body = await request.json();
    
    // Validate input
    const config: CostAlertConfig = {
      monthlyBudget: Math.max(1, Number(body.monthlyBudget) || DEFAULT_CONFIG.monthlyBudget),
      alerts: {
        warning: Math.min(100, Math.max(1, Number(body.alerts?.warning) || DEFAULT_CONFIG.alerts.warning)),
        critical: Math.min(100, Math.max(1, Number(body.alerts?.critical) || DEFAULT_CONFIG.alerts.critical)),
      },
      lastUpdated: new Date().toISOString(),
    };

    // Ensure warning < critical
    if (config.alerts.warning >= config.alerts.critical) {
      config.alerts.warning = Math.max(1, config.alerts.critical - 20);
    }

    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error updating cost alert config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
