/**
 * Seed Pipeline — Reads prospect data from report files dynamically
 * Usage: npx tsx scripts/seed-pipeline.ts
 *
 * Sources:
 * - reports/central/active/consultoria-f4-prospectos-midmarket-2026-05-02.md
 * - docs/SABATECH-OPERATIVE-PLAN-2026.md
 */
import Database from "../src/lib/sqlite-wrapper";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "kanban.db");
const REPORTS_BASE = path.join(process.cwd(), ".."); // workspace root

interface RawOpportunity {
  company: string;
  contact_name?: string;
  contact_email?: string;
  title: string;
  description?: string;
  stage: string;
  value: number;
  currency?: string;
  service_type: string;
  probability?: number;
  source: string;
  next_action?: string;
  next_action_date?: string;
  notes?: string;
}

function parseProspectosFile(): RawOpportunity[] {
  const filePath = path.join(
    REPORTS_BASE,
    "reports/central/active/consultoria-f4-prospectos-midmarket-2026-05-02.md"
  );
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️  Prospectos file not found:", filePath);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const opportunities: RawOpportunity[] = [];

  // Parse the main prospect table in section 3
  // | **Sherpa.ai** | Conversational AI | ~50 | $18M Serie B (2025) | ✅ Móviles para empresas | Budget medio | ... |
  const tableRegex = /\|\s*\*\*(.+?)\*\*\s*\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const company = match[1].trim();
    const sector = match[2].trim();
    const employees = match[3].trim();
    const funding = match[4].trim();
    const hasAgents = match[5].trim();
    const budget = match[6].trim();
    const angle = match[7].trim();

    // Skip header rows
    if (company === "Empresa" || company.startsWith("---") || company.startsWith(" ")) continue;

    // Map budget to estimated value
    let value = 10000;
    if (budget.toLowerCase().includes("alto")) value = 25000;
    else if (budget.toLowerCase().includes("medio")) value = 15000;
    else if (budget.toLowerCase().includes("bajo")) value = 5000;

    // Determine stage based on context
    const stage = "lead";

    // Determine service type from angle
    let serviceType = "consultoria_audit";
    if (angle.toLowerCase().includes("audit")) serviceType = "consultoria_audit";
    else if (angle.toLowerCase().includes("retainer") || angle.toLowerCase().includes("governance")) serviceType = "consultoria_retainer";
    else if (angle.toLowerCase().includes("managed") || angle.toLowerCase().includes("compliance")) serviceType = "consultoria_managed";

    opportunities.push({
      company,
      title: `Security Audit — ${company}`,
      description: `Sector: ${sector} | Empleados: ${employees} | Funding: ${funding} | AI Agents: ${hasAgents}`,
      stage,
      value,
      currency: "EUR",
      service_type: serviceType,
      source: "consultoria-f4-prospectos-midmarket-2026-05-02",
      next_action: `Investigar ${company} — LinkedIn contact, website, tech stack`,
      next_action_date: getFutureDate(7),
      notes: `Ángulo de contacto: ${angle} | Budget estimado: ${budget}`,
    });
  }

  return opportunities;
}

function parseOperativePlan(): RawOpportunity[] {
  const filePath = path.join(
    REPORTS_BASE,
    "docs/SABATECH-OPERATIVE-PLAN-2026.md"
  );
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️  Operative plan not found:", filePath);
    return [];
  }

  // Extract strategic opportunities from the plan
  const opportunities: RawOpportunity[] = [];

  // Product 1: Security Audit — market opportunity
  opportunities.push({
    company: "EU AI Act Compliance Market",
    title: "EU AI Act Compliance — Startup PYME Segment",
    description: "Agosto 2026: Estados miembros deben tener AI sandbox (Art. 57). Empresas buscando compliance desesperadamente. Gap: No hay tool asequible para startups/PYMEs. Competidores: OneTrust (caro), Holistic AI, Credo AI — todos enterprise-only.",
    stage: "qualifying",
    value: 35000,
    currency: "EUR",
    service_type: "consultoria_managed",
    probability: 0.35,
    source: "SABATECH-OPERATIVE-PLAN-2026",
    next_action: "Definir offering EU AI Act compliance para startups",
    next_action_date: getFutureDate(14),
    notes: "Ventana de oportunidad: Agosto 2026. Mercado explotando. Ningún competidor asequible.",
  });

  // Product 3: Orchestration — Alfred case
  opportunities.push({
    company: "SabaTech (Internal)",
    title: "Multi-Agent Orchestration — Caso Alfred como Servicio",
    description: "Alfred como caso real 24/7 con 5 especialistas. Self-hosted, non-negotiable for enterprises. Competidores: CrewAI (Python-only), LangGraph (complejo), AutoGen (Microsoft). Ventaja: Caso real funcionando.",
    stage: "proposal",
    value: 50000,
    currency: "EUR",
    service_type: "orquestacion_setup",
    probability: 0.5,
    source: "SABATECH-OPERATIVE-PLAN-2026",
    next_action: "Documentar caso Alfred (arquitectura, stack, resultados)",
    next_action_date: getFutureDate(10),
    notes: "Consultoría 150h / Setup 2999 / Managed 999/mes. Tendencia: self-hosting non-negotiable.",
  });

  return opportunities;
}

function getFutureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function main() {
  console.log("🌱 Seed Pipeline — Loading opportunities from report files...\n");

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Check existing count
  const existing = db.prepare("SELECT count(*) as count FROM opportunities").get() as { count: number };
  console.log(`📊 Existing opportunities: ${existing.count}`);

  if (existing.count > 0) {
    console.log("⚠️  Pipeline already has data. Skipping seed. Use --force to override.");
    db.close();
    return;
  }

  // Parse data sources
  const fromProspectos = parseProspectosFile();
  const fromOperativePlan = parseOperativePlan();
  const allOpportunities = [...fromProspectos, ...fromOperativePlan];

  console.log(`📄 From prospectos report: ${fromProspectos.length} opportunities`);
  console.log(`📄 From operative plan: ${fromOperativePlan.length} opportunities`);
  console.log(`📊 Total to insert: ${allOpportunities.length}\n`);

  if (allOpportunities.length === 0) {
    console.log("❌ No opportunities found. Check report file paths.");
    db.close();
    return;
  }

  // Insert
  const insert = db.prepare(`
    INSERT INTO opportunities (id, company, contact_name, contact_email, contact_linkedin, title, description, stage, value, currency, service_type, probability, source, next_action, next_action_date, notes, created_at, updated_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  let inserted = 0;

  const insertMany = db.transaction((opps: RawOpportunity[]) => {
    for (const opp of opps) {
      const id = randomUUID();
      insert.run(
        id,
        opp.company,
        opp.contact_name || null,
        opp.contact_email || null,
        null, // linkedin
        opp.title,
        opp.description || null,
        opp.stage,
        opp.value,
        opp.currency || "EUR",
        opp.service_type,
        opp.probability ?? null,
        opp.source,
        opp.next_action || null,
        opp.next_action_date || null,
        opp.notes || null,
        now,
        now,
        null
      );
      inserted++;
      console.log(`  ✅ ${opp.company} — ${opp.title} (${opp.stage}, €${opp.value.toLocaleString()})`);
    }
  });

  insertMany(allOpportunities);

  console.log(`\n🎉 Seeded ${inserted} opportunities!`);

  // Verify
  const kpis = db.prepare(`
    SELECT
      stage,
      count(*) as count,
      sum(value) as total_value
    FROM opportunities
    GROUP BY stage
    ORDER BY stage
  `).all() as { stage: string; count: number; total_value: number }[];

  console.log("\n📊 Pipeline KPIs:");
  let totalPipeline = 0;
  for (const row of kpis) {
    console.log(`  ${row.stage}: ${row.count} opps — €${row.total_value?.toLocaleString()}`);
    if (row.stage !== "won" && row.stage !== "lost") {
      totalPipeline += row.total_value || 0;
    }
  }
  console.log(`  Total pipeline value: €${totalPipeline.toLocaleString()}`);

  db.close();
}

main();
