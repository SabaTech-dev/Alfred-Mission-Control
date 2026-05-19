"use client";

export interface Skill {
  id: string;
  name: string;
  description: string;
  location: string;
  source: "workspace" | "system";
  workspace?: string;
  homepage?: string;
  emoji?: string;
  fileCount: number;
  fullContent: string;
  files: string[];
  agents: string[];
  enabled: boolean;
}

export interface SkillsInitialData {
  skills: Skill[];
}

export interface SkillUpdate {
  slug: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
}