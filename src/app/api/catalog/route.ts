import { NextResponse } from "next/server";
import type { ServiceProduct, CatalogKPIs } from "@/lib/catalog-types";

// Static catalog data — easy to update
const SERVICES: ServiceProduct[] = [
  {
    id: "consultoria-audit",
    category: "consultoria",
    name: "Agent Security Audit",
    tagline: "Auditoría de seguridad para sistemas de agentes IA",
    description:
      "Evaluación completa de la postura de seguridad de tus sistemas de IA generativa y agentes autónomos. Basado en OWASP ASI Top 10, NIST AI RMF y EU AI Act.",
    landingUrl: "https://saba-agent-security-consulting.vercel.app",
    repoPath: "saba-agent-security-consulting",
    status: "live",
    frameworks: ["OWASP ASI Top 10", "NIST AI RMF 1.0", "EU AI Act", "STRIDE"],
    targetMarket: "Mid-market (1-500 empleados)",
    tiers: [
      {
        name: "Audit One-Shot",
        price: "€5,000",
        priceDetail: "pago único",
        description: "Evaluación completa en 3 semanas",
        features: [
          "74 controles OWASP ASI + NIST",
          "Threat model (STRIDE)",
          "Informe ejecutivo + técnico",
          "Plan de remediación priorizado",
          "1 revisión incluida",
        ],
        highlight: true,
      },
      {
        name: "Security Retainer",
        price: "€2,000",
        priceDetail: "/mes",
        description: "Soporte continuo de seguridad",
        features: [
          "Monitoreo continuo",
          "Revisión mensual de configuración",
          "Respuesta a incidentes (SLA 24h)",
          "Actualización de controles",
          "Informe mensual",
        ],
      },
      {
        name: "Managed Security",
        price: "€10,000",
        priceDetail: "/mes",
        description: "Gestión completa de seguridad IA",
        features: [
          "Todo de Retainer",
          "Red teaming mensual",
          "Hardening continuo",
          "Compliance EU AI Act",
          "Training equipo (4h/mes)",
        ],
      },
    ],
  },
  {
    id: "orquestacion-setup",
    category: "orquestacion",
    name: "Orquestación Multi-Agente",
    tagline: "Equipos de agentes IA trabajando por ti",
    description:
      "Configuración de sistemas multi-agente personalizados con OpenProse, memoria persistente (Hindsight) y Mission Control. Desde prototipos hasta producción.",
    landingUrl: "https://saba-agentic-orchestration.vercel.app",
    repoPath: "saba-agentic-orchestration",
    status: "live",
    frameworks: ["OpenProse", "Hindsight Memory", "Mission Control", "AutoResearch"],
    targetMarket: "Startups y mid-market tech",
    tiers: [
      {
        name: "Setup Básico",
        price: "€3,000",
        priceDetail: "pago único",
        description: "2-3 agentes, 1 workflow, 1 semana",
        features: [
          "2-3 agentes especializados",
          "1 workflow automatizado",
          "Memoria persistente",
          "Mission Control acceso",
          "Documentación básica",
        ],
        highlight: true,
      },
      {
        name: "Config Avanzada",
        price: "€7,000",
        priceDetail: "pago único",
        description: "5-7 agentes, 3-5 workflows, 4 semanas",
        features: [
          "5-7 agentes especializados",
          "3-5 workflows complejos",
          "Integraciones API custom",
          "Skills personalizadas",
          "AutoResearch habilitado",
          "Training equipo incluido",
        ],
      },
      {
        name: "Managed Service",
        price: "€2,000",
        priceDetail: "/mes",
        description: "Mantenimiento y mejora continua",
        features: [
          "Mantenimiento continuo",
          "Mejoras mensuales",
          "SLA 24h respuesta",
          "Monitoreo proactivo",
          "Optimización de agentes",
        ],
      },
    ],
  },
  {
    id: "qa-framework",
    category: "qa_framework",
    name: "QA Framework",
    tagline: "Plataforma de testing automatizado con IA",
    description:
      "Plataforma SaaS de testing QA potenciada por IA. Generación automática de tests, ejecución paralela y reportes inteligentes.",
    landingUrl: null,
    repoPath: null,
    status: "development",
    tiers: [
      {
        name: "Free",
        price: "€0",
        priceDetail: "/mes",
        description: "Para proyectos personales",
        features: ["100 tests/mes", "1 proyecto", "Reportes básicos"],
      },
      {
        name: "Pro",
        price: "€49",
        priceDetail: "/mes",
        description: "Para equipos pequeños",
        features: [
          "Tests ilimitados",
          "5 proyectos",
          "AI test generation",
          "Integraciones CI/CD",
          "Reportes avanzados",
        ],
        highlight: true,
      },
      {
        name: "Enterprise",
        price: "€199",
        priceDetail: "/mes",
        description: "Para organizaciones",
        features: [
          "Todo de Pro",
          "Proyectos ilimitados",
          "SSO/SAML",
          "SLA garantizado",
          "Soporte prioritario",
        ],
      },
    ],
  },
];

export async function GET() {
  const kpis: CatalogKPIs = {
    total_services: SERVICES.length,
    live_count: SERVICES.filter((s) => s.status === "live").length,
    total_tiers: SERVICES.reduce((acc, s) => acc + s.tiers.length, 0),
    avg_price_consultoria: 5000,
    avg_price_orquestacion: 4000,
    revenue_potential_y1: 294000,
  };

  return NextResponse.json({ services: SERVICES, kpis });
}
