#!/bin/bash
# Cargar oportunidades en el Pipeline via API

TOKEN="eyJleHAiOjE3Nzg2MTI2OTMxMjUsImp0aSI6ImM1OGI2MWU2LWU5MTktNGQ2ZC05MWFhLTBmNmQ3ZWUwNWI0MCJ9.5ww4kf30My9QwXzIt6WI3kopKP1ZAcqJek9hQajMmic"
API="http://localhost:3000/api/pipeline"

echo "Cargando oportunidades en el Pipeline..."

# Tier 1 - Main Prospects
curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Sherpa.ai",
    "title": "Security Audit - Conversational AI",
    "description": "Móviles para empresas. $18M Serie B (2025). ~50 empleados. Angle: Auditoría de seguridad para agentes móviles",
    "stage": "lead",
    "value": 1499,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Research - Mid-Market Prospectos",
    "next_action": "Validar CTO/Head of Engineering + outreach LinkedIn",
    "notes": "Tier 1 - medio budget. Sector: Conversational AI"
  }' > /dev/null && echo "✅ Sherpa.ai"

curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Aivo",
    "title": "Security Audit - Conversational AI",
    "description": "Bot agents para atención al cliente. Series B/C. 50-100 empleados. Angle: Security audit de conversational agents",
    "stage": "lead",
    "value": 2499,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Research - Mid-Market Prospectos",
    "next_action": "Validar CTO/Head of Engineering + outreach LinkedIn",
    "notes": "Tier 1 - alto budget. Sector: Conversational AI"
  }' > /dev/null && echo "✅ Aivo"

curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Genesy",
    "title": "Security Audit - Digital Agents",
    "description": "Proveedor de agentes digitales. Seed/Series A (española). 20-50 empleados. Angle: Audit de tu plataforma de agentes",
    "stage": "lead",
    "value": 1499,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Research - Mid-Market Prospectos",
    "next_action": "Validar CTO/Head of Engineering + outreach LinkedIn",
    "notes": "Tier 1 - medio budget. Sector: Digital agents"
  }' > /dev/null && echo "✅ Genesy"

curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Jack & Jill",
    "title": "Security Audit - AI Recruitment",
    "description": "AI agents para job seekers. Fundado (2025). ~50 empleados. Angle: Security audit de recruitment agents (GDPR/PII)",
    "stage": "contacted",
    "value": 1499,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Research - Mid-Market Prospectos",
    "next_action": "Validar CTO/Head of Engineering + outreach LinkedIn",
    "notes": "Tier 1 - medio budget. Sector: AI recruitment"
  }' > /dev/null && echo "✅ Jack & Jill"

curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Actively",
    "title": "Security Audit - AI Sales Agents",
    "description": "Sales agents 24/7. $45M Serie B (abril 2026). ~50 empleados. Angle: Audit de agent identities + tool permissions",
    "stage": "lead",
    "value": 2499,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Research - Mid-Market Prospectos",
    "next_action": "Validar CTO/Head of Engineering + outreach LinkedIn",
    "notes": "Tier 1 - alto budget. Sector: AI sales agents"
  }' > /dev/null && echo "✅ Actively"

# Tier 2 - Additional Prospects
for company in "Qorum" "Eva" "Twin" "Blink" "Zapiens" "Flux.ai" "Cognigy" "Solvemate" "Typeless"; do
  curl -sf -X POST "$API" \
    -H "Cookie: auth_token=$TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"company\": \"$company\",
      \"title\": \"Security Audit - AI Agents\",
      \"description\": \"Candidato adicional - requiere investigación de funding y empleados\",
      \"stage\": \"qualifying\",
      \"value\": 999,
      \"currency\": \"EUR\",
      \"service_type\": \"consultoria_audit\",
      \"source\": \"Research - Scout Startups\",
      \"next_action\": \"Investigar funding/empleados + validar uso de agentes AI\",
      \"notes\": \"Tier 2 - información preliminar, requiere validación\"
    }" > /dev/null && echo "✅ $company (Tier 2)"
done

# Internal Opportunities
curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "OSINT-NEXUS Productization",
    "title": "Security Audit SaaS Platform",
    "description": "Empaquetar OSINT-NEXUS como servicio de auditoría de seguridad para IA. Oportunidad GOLD MINE - cubre 70-80% del stack necesario.",
    "stage": "proposal",
    "value": 49999,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Internal - Operative Plan",
    "next_action": "Fix repo + Docker + pricing + SaaS wrapper",
    "notes": "P0 - Requiere infraestructura (DevOps) + packaging (Coder)"
  }' > /dev/null && echo "✅ OSINT-NEXUS Productization"

curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "QA-FRAMEWORK Beta Launch",
    "title": "QA-FRAMEWORK as SaaS",
    "description": "QA-FRAMEWORK ya está a 82.59% coverage con dashboard React + FastAPI. Listo para beta launch con pricing tiers.",
    "stage": "negotiation",
    "value": 29999,
    "currency": "EUR",
    "service_type": "consultoria_audit",
    "source": "Internal - Operative Plan",
    "next_action": "Pricing + waitlist + screenshots + demo deploy",
    "notes": "P1 - Casi listo, enfocar en beta launch"
  }' > /dev/null && echo "✅ QA-FRAMEWORK Beta Launch"

curl -sf -X POST "$API" \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Multi-Agent Orchestration Service",
    "title": "Orquestación como Servicio - Alfred Case Study",
    "description": "Vender orquestación multi-agent basado en caso real Alfred (5 especialistas 24/7). Diferenciador: self-hosting + caso de uso en producción.",
    "stage": "qualifying",
    "value": 59999,
    "currency": "EUR",
    "service_type": "orquestacion_setup",
    "source": "Internal - Operative Plan",
    "next_action": "Documentar caso Alfred + pricing + landing update",
    "notes": "P1 - Ventaja: self-hosting, no dependency on cloud providers"
  }' > /dev/null && echo "✅ Multi-Agent Orchestration Service"

echo ""
echo "🎉 Carga completada. Verificando..."
curl -sf "$API" -H "Cookie: auth_token=$TOKEN" | python3 -m json.tool | grep -A2 "total_opportunities"
