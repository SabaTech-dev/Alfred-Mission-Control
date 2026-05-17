/**
 * Skills Audit API
 * GET /api/learning/skills-audit — Runs skills check + list, computes health score
 * POST /api/learning/skills-audit — Triggers skills update
 */
import { NextResponse } from "next/server";
import { safeExecFile, isValidSlug } from "@/lib/safe-exec";

export const dynamic = "force-dynamic";

interface SkillEntry {
  name: string;
  emoji: string;
  status: "active" | "disabled" | "missing" | "command-only";
  source?: string;
  description?: string;
  missingBins?: string;
  updateAvailable?: boolean;
}

interface SkillsAudit {
  total: number;
  eligible: number;
  visibleToModel: number;
  availableAsCommand: number;
  disabled: number;
  blocked: number;
  excludedByAgent: number;
  missingRequirements: number;
  healthScore: number;
  skills: SkillEntry[];
  timestamp: string;
}

function parseNumber(text: string, regex: RegExp): number {
  const match = text.match(regex);
  return match ? parseInt(match[1], 10) : 0;
}

function parseSkillsCheck(output: string): Omit<SkillsAudit, "timestamp"> {
  const total = parseNumber(output, /Total:\s*(\d+)/);
  const eligible = parseNumber(output, /Eligible:\s*(\d+)/);
  const visibleToModel = parseNumber(output, /Visible to model:\s*(\d+)/);
  const availableAsCommand = parseNumber(output, /Available as command:\s*(\d+)/);
  const disabled = parseNumber(output, /Disabled:\s*(\d+)/);
  const blocked = parseNumber(output, /Blocked by allowlist:\s*(\d+)/);
  const excludedByAgent = parseNumber(output, /Excluded by agent allowlist:\s*(\d+)/);
  const missingRequirements = parseNumber(output, /Missing requirements:\s*(\d+)/);

  const skills: SkillEntry[] = [];
  const lines = output.split("\n");
  let currentSection: "active" | "missing" | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (/^Ready and visible to model:/.test(trimmed)) {
      currentSection = "active";
      continue;
    }
    if (/^Missing requirements:/.test(trimmed)) {
      currentSection = "missing";
      continue;
    }
    if (/^(What this means|Tip:)/.test(trimmed)) {
      currentSection = null;
      continue;
    }
    if (trimmed === "") continue;

    const skillMatch = trimmed.match(/^\s+(.)\s+(.+?)(?:\s+\((.+)\))?$/u);
    if (skillMatch && currentSection) {
      const emoji = skillMatch[1];
      const name = skillMatch[2].trim();
      const detail = skillMatch[3] || undefined;

      if (name && !name.startsWith("(")) {
        skills.push({
          name,
          emoji,
          status: currentSection === "missing" ? "missing" : "active",
          missingBins: currentSection === "missing" ? detail : undefined,
        });
      }
    }
  }

  const eligibleRatio = total > 0 ? eligible / total : 0;
  const visibleRatio = total > 0 ? visibleToModel / total : 0;
  const commandRatio = total > 0 ? availableAsCommand / total : 0;
  let healthScore = Math.round(eligibleRatio * 70 + visibleRatio * 20 + commandRatio * 10);
  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    total,
    eligible,
    visibleToModel,
    availableAsCommand,
    disabled,
    blocked,
    excludedByAgent,
    missingRequirements,
    healthScore,
    skills,
  };
}

/**
 * Parse `openclaw skills list` output (table format) to extract disabled skills
 * with their source and description.
 */
function parseSkillsList(output: string, existingSkills: SkillEntry[]): SkillEntry[] {
  const skillsMap = new Map(existingSkills.map(s => [s.name, s]));
  const lines = output.split("\n");
  let currentSkill: {
    status: string;
    emoji: string;
    name: string;
    description: string;
    source: string;
  } | null = null;

  for (const line of lines) {
    const trimmed = line.replace(/\x1b\[[0-9;]*m/g, "").trimEnd(); // strip ANSI
    // Match table rows: │ status │ emoji name │ desc │ source │
    const rowMatch = trimmed.match(/^│\s*(✓ ready|⏸ disabled|⚠ partial)\s*│\s*(.)\s+(.+?)\s*│\s*(.+?)\s*│\s*(.+?)\s*│$/);
    if (rowMatch) {
      const status = rowMatch[1].includes("disabled") ? "disabled" : rowMatch[1].includes("ready") ? "active" : "missing";
      const emoji = rowMatch[2];
      const name = rowMatch[3].trim();
      const desc = rowMatch[4].trim();
      const source = rowMatch[5].trim();

      currentSkill = { status, emoji, name, description: desc, source };

      if (status === "disabled") {
        const existing = skillsMap.get(name);
        if (existing) {
          existing.status = "disabled";
          existing.source = source;
          existing.description = desc;
        } else {
          skillsMap.set(name, {
            name,
            emoji,
            status: "disabled",
            source,
            description: desc,
          });
        }
      } else if (!skillsMap.has(name)) {
        skillsMap.set(name, {
          name,
          emoji,
          status: status === "active" ? "active" : "missing",
          source,
          description: desc,
        });
      } else {
        const existing = skillsMap.get(name)!;
        if (!existing.source) existing.source = source;
        if (!existing.description) existing.description = desc;
      }
    }
  }

  return Array.from(skillsMap.values());
}

export async function GET() {
  try {
    // Run skills check
    const checkResult = safeExecFile("openclaw", ["skills", "check"], {
      timeout: 30000,
    });

    if (checkResult.status !== 0 && !checkResult.stdout) {
      return NextResponse.json(
        {
          error: "Failed to run skills check",
          details: checkResult.stderr || checkResult.error?.message || "Unknown error",
        },
        { status: 500 },
      );
    }

    const parsed = parseSkillsCheck(checkResult.stdout || "");

    // Also run skills list to get disabled skills with source/description
    const listResult = safeExecFile("openclaw", ["skills", "list"], {
      timeout: 30000,
    });

    const allSkills = listResult.stdout
      ? parseSkillsList(listResult.stdout, parsed.skills)
      : parsed.skills;

    // Update disabled count from parsed check output (more accurate)
    const audit: SkillsAudit = {
      ...parsed,
      skills: allSkills,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(audit);
  } catch (error) {
    console.error("[skills-audit] Error:", error);
    return NextResponse.json(
      { error: "Failed to execute skills audit" },
      { status: 500 },
    );
  }
}

/**
 * POST handler — trigger skills update
 * Body: { slug?: string } — if provided, update single skill; otherwise update all
 */
export async function POST(request: Request) {
  try {
    let slug: string | undefined;
    try {
      const body = await request.json();
      slug = body.slug;
    } catch {
      // no body
    }

    const args = ["skills", "update"];
    if (slug) {
      if (!isValidSlug(slug)) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      args.push(slug);
    } else {
      args.push("--all");
    }

    const result = safeExecFile("openclaw", args, { timeout: 120000 });

    return NextResponse.json({
      success: result.status === 0,
      output: (result.stdout || "").trim(),
      errors: (result.stderr || "").trim(),
    });
  } catch (error) {
    console.error("[skills-audit] Update error:", error);
    return NextResponse.json(
      { error: "Failed to execute skills update" },
      { status: 500 },
    );
  }
}
