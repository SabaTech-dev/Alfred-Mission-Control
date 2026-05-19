/**
 * Report Parser — parses markdown report files into structured data
 * for pipeline auto-sync.
 */

export type OpportunitySource =
  | "security_audit"
  | "security_review"
  | "security_rereview"
  | "research_market"
  | "research_technology"
  | "qa_review"
  | "qa_testing"
  | "devops_infra"
  | "other";

export interface ParsedReport {
  reportId: string;
  agent: string;
  serviceType: OpportunitySource;
  target: string;
  date: string | null;
  title: string;
  summary: string | null;
  taskId: string | null;
  reportStatus: string | null;
  isOpportunity: boolean;
  confidence: number;
}

export interface ParsedFilename {
  agent: string;
  serviceType: OpportunitySource;
  target: string;
  date: string | null;
}

const AGENT_PREFIX_MAP: Record<string, { agent: string; serviceType: OpportunitySource }> = {
  "security-audit": { agent: "security", serviceType: "security_audit" },
  "security-review": { agent: "security", serviceType: "security_review" },
  "security-rereview": { agent: "security", serviceType: "security_rereview" },
  "research-market": { agent: "research", serviceType: "research_market" },
  "research-tech": { agent: "research", serviceType: "research_technology" },
  "qa-review": { agent: "qa-tester", serviceType: "qa_review" },
  "qa-testing": { agent: "qa-tester", serviceType: "qa_testing" },
  "devops-infra": { agent: "devops", serviceType: "devops_infra" },
};

const DATE_PATTERN = /-\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a report filename into agent, serviceType, target, and date.
 */
export function parseReportFilename(filename: string): ParsedFilename {
  const stem = filename.replace(/\.md$/, "");

  for (const [prefix, info] of Object.entries(AGENT_PREFIX_MAP)) {
    if (stem.startsWith(prefix + "-")) {
      const remainder = stem.slice(prefix.length + 1);
      const dateMatch = remainder.match(DATE_PATTERN);
      const date = dateMatch ? dateMatch[0].slice(1) : null;
      const targetRaw = dateMatch
        ? remainder.slice(0, remainder.length - dateMatch[0].length)
        : remainder;
      return {
        agent: info.agent,
        serviceType: info.serviceType,
        target: targetRaw,
        date,
      };
    }
  }

  // Unknown prefix — fallback
  const parts = stem.split("-");
  const dateMatch = stem.match(DATE_PATTERN);
  const date = dateMatch ? dateMatch[0].slice(1) : null;
  const targetRaw = dateMatch
    ? stem.slice(0, stem.length - dateMatch[0].length)
    : stem;
  return {
    agent: parts[0],
    serviceType: "other",
    target: targetRaw,
    date,
  };
}

/**
 * Convert a kebab-case target string to title case.
 */
function titleCase(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Extract a bold field value from markdown content.
 * Matches patterns like **Label:** value
 */
function extractBoldField(content: string, label: string): string | null {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract text between two headings in markdown.
 */
function extractSection(content: string, heading: string): string | null {
  const regex = new RegExp(`## ${heading}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Determine if a service type represents a billable opportunity.
 */
function isBillableSource(source: OpportunitySource): boolean {
  return source !== "other";
}

/**
 * Calculate confidence score (0-100) for a report being a real opportunity.
 */
function calculateConfidence(
  source: OpportunitySource,
  hasTarget: boolean,
  hasSummary: boolean,
  status: string | null
): number {
  let score = 0;

  if (isBillableSource(source)) score += 40;
  if (hasTarget) score += 20;
  if (hasSummary) score += 20;
  if (status && status.toUpperCase() === "COMPLETO") score += 20;

  return Math.min(score, 100);
}

/**
 * Parse a full report file into structured data.
 */
export function parseReport(content: string, filename: string): ParsedReport {
  const parsed = parseReportFilename(filename);
  const agentField = extractBoldField(content, "Agente");
  const taskId = extractBoldField(content, "Task ID");
  const statusRaw = extractBoldField(content, "Estado");
  const summary = extractSection(content, "Resumen") || extractSection(content, "Resumen Ejecutivo");

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : titleCase(parsed.target || filename);

  // Clean status — strip emojis
  let reportStatus: string | null = null;
  if (statusRaw) {
    const cleaned = statusRaw
      .replace(/[✅❌⚠️]/g, "")
      .trim()
      .toUpperCase();
    if (cleaned.includes("COMPLETO") || cleaned.includes("PASS")) {
      reportStatus = "COMPLETO";
    } else if (cleaned.includes("FAIL")) {
      reportStatus = "FAIL";
    } else {
      reportStatus = cleaned.split(/[-\s]/)[0] || null;
    }
  }

  const target = parsed.target ? titleCase(parsed.target) : titleCase(filename.replace(/\.md$/, ""));

  const confidence = calculateConfidence(
    parsed.serviceType,
    !!target,
    !!summary,
    reportStatus
  );

  return {
    reportId: filename.replace(/\.md$/, ""),
    agent: agentField || parsed.agent,
    serviceType: parsed.serviceType,
    target,
    date: parsed.date,
    title,
    summary,
    taskId,
    reportStatus,
    isOpportunity: confidence >= 50,
    confidence,
  };
}

const ESTIMATED_VALUES: Record<OpportunitySource, number> = {
  security_audit: 5000,
  security_review: 5000,
  security_rereview: 5000,
  research_market: 4000,
  research_technology: 4000,
  qa_review: 3000,
  qa_testing: 3000,
  devops_infra: 6000,
  other: 2000,
};

/**
 * Get the estimated monetary value for a given service type.
 */
export function getEstimatedValue(source: OpportunitySource): number {
  return ESTIMATED_VALUES[source] ?? 2000;
}
