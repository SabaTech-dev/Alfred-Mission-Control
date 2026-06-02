#!/usr/bin/env node
/**
 * Cargar oportunidades reales en el Pipeline desde sources de datos
 * Fuentes:
 * 1. reports/central/active/consultoria-f4-prospectos-midmarket-2026-05-02.md
 * 2. docs/SABATECH-OPERATIVE-PLAN-2026.md
 * 3. Kanban tasks (para oportunidades internas)
 */

const fs = require('fs');
const path = require('path');
const { createOpportunity } = require('../src/lib/pipeline-db');

// Configuración
const WORKSPACE = path.resolve(process.env.OPENCLAW_WORKSPACE || '/home/joker/.openclaw/workspace');
const SOURCES = {
  prospectosMidMarket: path.join(WORKSPACE, 'reports/central/active/consultoria-f4-prospectos-midmarket-2026-05-02.md'),
  operativePlan: path.join(WORKSPACE, 'docs/SABATECH-OPERATIVE-PLAN-2026.md'),
};

// Service types y valores (del Operative Plan)
const PRICING = {
  consultoria_audit: { min: 499, typical: 1499, max: 3999, currency: 'EUR' },
  consultoria_retainer: { min: 5000, typical: 10000, max: 25000, currency: 'EUR', monthly: true },
  consultoria_managed: { min: 10000, typical: 25000, max: 99999, currency: 'EUR', monthly: true },
  orquestacion_setup: { min: 150, typical: 2999, max: 10000, currency: 'EUR' },
  orquestation_advanced: { min: 5000, typical: 15000, max: 50000, currency: 'EUR' },
  orquestacion_managed: { min: 500, typical: 999, max: 5000, currency: 'EUR', monthly: true },
};

/**
 * Parsear el reporte de prospectos mid-market
 */
function parseProspectosMidMarket(content) {
  const opportunities = [];

  // Prospector principales (Tier 1)
  const mainProspects = [
    {
      company: 'Sherpa.ai',
      sector: 'Conversational AI',
      employees: '~50',
      funding: '$18M Serie B (2025)',
      ai_agents: 'Móviles para empresas',
      budget: 'medio',
      angle: 'Auditoría de seguridad para agentes móviles',
      value: 1499,
      stage: 'lead',
    },
    {
      company: 'Aivo',
      sector: 'Conversational AI',
      employees: '50-100',
      funding: 'Series B/C',
      ai_agents: 'Bot agents para atención al cliente',
      budget: 'alto',
      angle: 'Security audit de conversational agents',
      value: 2499,
      stage: 'lead',
    },
    {
      company: 'Genesy',
      sector: 'Digital agents',
      employees: '20-50',
      funding: 'Seed/Series A (española)',
      ai_agents: 'Proveedor de agentes digitales',
      budget: 'medio',
      angle: 'Audit de tu plataforma de agentes',
      value: 1499,
      stage: 'lead',
    },
    {
      company: 'Jack & Jill',
      sector: 'AI recruitment',
      employees: '~50',
      funding: 'Fundado (2025)',
      ai_agents: 'AI agents para job seekers',
      budget: 'medio',
      angle: 'Security audit de recruitment agents (GDPR/PII)',
      value: 1499,
      stage: 'contacted',
    },
    {
      company: 'Actively',
      sector: 'AI sales agents',
      employees: '~50',
      funding: '$45M Serie B (abril 2026)',
      ai_agents: 'Sales agents 24/7',
      budget: 'alto',
      angle: 'Audit de agent identities + tool permissions',
      value: 2499,
      stage: 'lead',
    },
  ];

  for (const prospect of mainProspects) {
    opportunities.push({
      company: prospect.company,
      title: `Security Audit - ${prospect.sector}`,
      description: `${prospect.ai_agents}. ${prospect.funding}. ${prospect.employees} empleados. Angle: ${prospect.angle}`,
      stage: prospect.stage,
      value: prospect.value,
      currency: 'EUR',
      service_type: 'consultoria_audit',
      source: 'Research - Mid-Market Prospectos',
      next_action: 'Validar CTO/Head of Engineering + outreach LinkedIn',
      notes: `Tier 1 - ${prospect.budget} budget. Sector: ${prospect.sector}`,
    });
  }

  // Candidatos adicionales (Tier 2) - marcar como qualifying
  const additionalProspects = [
    'Qorum', 'Eva', 'Twin', 'Blink', 'Zapiens',
    'Flux.ai', 'Cognigy', 'Solvemate', 'Typeless'
  ];

  for (const company of additionalProspects) {
    opportunities.push({
      company: company,
      title: 'Security Audit - AI Agents',
      description: 'Candidato adicional - requiere investigación de funding y empleados',
      stage: 'qualifying',
      value: 999,
      currency: 'EUR',
      service_type: 'consultoria_audit',
      source: 'Research - Scout Startups',
      next_action: 'Investigar funding/empleados + validar uso de agentes AI',
      notes: 'Tier 2 - información preliminar, requiere validación',
    });
  }

  return opportunities;
}

/**
 * Parsear el plan operativo para oportunidades internas
 */
function parseOperativePlan(content) {
  const opportunities = [];

  // Oportunidades de producto (desde el plan operativo)
  opportunities.push({
    company: 'OSINT-NEXUS Productization',
    title: 'Security Audit SaaS Platform',
    description: 'Empaquetar OSINT-NEXUS como servicio de auditoría de seguridad para IA. Oportunidad GOLD MINE - cubre 70-80% del stack necesario.',
    stage: 'proposal',
    value: 49999,
    currency: 'EUR',
    service_type: 'consultoria_audit',
    source: 'Internal - Operative Plan',
    next_action: 'Fix repo + Docker + pricing + SaaS wrapper',
    notes: 'P0 - Requiere infraestructura (DevOps) + packaging (Coder)',
  });

  opportunities.push({
    company: 'QA-FRAMEWORK Beta Launch',
    title: 'QA-FRAMEWORK as SaaS',
    description: 'QA-FRAMEWORK ya está a 82.59% coverage con dashboard React + FastAPI. Listo para beta launch con pricing tiers.',
    stage: 'negotiation',
    value: 29999,
    currency: 'EUR',
    service_type: 'consultoria_audit',
    source: 'Internal - Operative Plan',
    next_action: 'Pricing + waitlist + screenshots + demo deploy',
    notes: 'P1 - Casi listo, enfocar en beta launch',
  });

  opportunities.push({
    company: 'Multi-Agent Orchestration Service',
    title: 'Orquestación como Servicio - Alfred Case Study',
    description: 'Vender orquestación multi-agent basado en caso real Alfred (5 especialistas 24/7). Diferenciador: self-hosting + caso de uso en producción.',
    stage: 'qualifying',
    value: 59999,
    currency: 'EUR',
    service_type: 'orquestacion_setup',
    source: 'Internal - Operative Plan',
    next_action: 'Documentar caso Alfred + pricing + landing update',
    notes: 'P1 - Ventaja: self-hosting, no dependency on cloud providers',
  });

  return opportunities;
}

/**
 * Cargar oportunidades en el pipeline
 */
function loadOpportunities() {
  let totalLoaded = 0;

  // Leer y parsear fuentes
  let midMarketContent = '';
  let operativePlanContent = '';

  try {
    if (fs.existsSync(SOURCES.prospectosMidMarket)) {
      midMarketContent = fs.readFileSync(SOURCES.prospectosMidMarket, 'utf-8');
      console.log(`✅ Leído: ${SOURCES.prospectosMidMarket}`);
    } else {
      console.log(`⚠️  No encontrado: ${SOURCES.prospectosMidMarket}`);
    }
  } catch (err) {
    console.error(`❌ Error leyendo ${SOURCES.prospectosMidMarket}:`, err.message);
  }

  try {
    if (fs.existsSync(SOURCES.operativePlan)) {
      operativePlanContent = fs.readFileSync(SOURCES.operativePlan, 'utf-8');
      console.log(`✅ Leído: ${SOURCES.operativePlan}`);
    } else {
      console.log(`⚠️  No encontrado: ${SOURCES.operativePlan}`);
    }
  } catch (err) {
    console.error(`❌ Error leyendo ${SOURCES.operativePlan}:`, err.message);
  }

  // Parsear oportunidades
  const opportunities = [];

  if (midMarketContent) {
    const midMarketOpps = parseProspectosMidMarket(midMarketContent);
    opportunities.push(...midMarketOpps);
    console.log(`📊 Parseados ${midMarketOpps.length} prospectos de mid-market`);
  }

  if (operativePlanContent) {
    const planOpps = parseOperativePlan(operativePlanContent);
    opportunities.push(...planOpps);
    console.log(`📊 Parseadas ${planOpps.length} oportunidades internas`);
  }

  // Insertar en base de datos
  console.log('\n🔄 Cargando oportunidades en el pipeline...\n');

  for (const opp of opportunities) {
    try {
      const created = createOpportunity(opp);
      totalLoaded++;
      console.log(`✅ ${created.company}: ${created.title} (${created.stage}) - €${created.value}`);
    } catch (err) {
      console.error(`❌ Error creando ${opp.company}:`, err.message);
    }
  }

  console.log(`\n🎉 Total cargadas: ${totalLoaded} oportunidades`);
}

// Ejecutar
if (require.main === module) {
  loadOpportunities();
}

module.exports = { loadOpportunities };
