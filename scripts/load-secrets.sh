#!/bin/bash
# load-secrets.sh — Carga secrets desde /etc/alfred-mission-control/.env
# Uso: source scripts/load-secrets.sh
# O: eval $(scripts/load-secrets.sh)

SECRETS_FILE="/etc/alfred-mission-control/.env"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "ERROR: $SECRETS_FILE no encontrado" >&2
  echo "Crea el archivo con los secrets necesarios:" >&2
  echo "  ADMIN_PASSWORD=..." >&2
  echo "  AUTH_SECRET=..." >&2
  echo "  OPENCLAW_GATEWAY_TOKEN=..." >&2
  echo "  KANBAN_AGENT_KEYS=..." >&2
  exit 1
fi

# Exportar solo los secrets sensibles (no los NEXT_PUBLIC_*)
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  # Export the variable
  export "$key=$value"
  echo "export $key=****"
done < "$SECRETS_FILE"

echo "# Secrets cargados desde $SECRETS_FILE"
