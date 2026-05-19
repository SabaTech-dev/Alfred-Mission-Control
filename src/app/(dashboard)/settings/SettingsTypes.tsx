"use client";

export interface SystemData {
  agent: {
    name: string;
    creature: string;
    emoji: string;
  };
  system: {
    uptime: number;
    uptimeFormatted: string;
    nodeVersion: string;
    model: string;
    workspacePath: string;
    platform: string;
    hostname: string;
    memory: {
      total: number;
      free: number;
      used: number;
    };
  };
  integrations: Array<{
    id: string;
    name: string;
    status: "connected" | "disconnected" | "configured" | "not_configured";
    icon: string;
    lastActivity: string | null;
  }>;
  timestamp: string;
}

export interface AboutStats {
  totalActivities: number;
  successRate: number;
  skillsCount: number;
  cronJobs: number;
}

export interface RealSkill {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  source: "workspace" | "system";
}

export type SettingsTab = "system" | "config" | "pricing" | "about";