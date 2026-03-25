#!/bin/bash
# Sync OpenClaw sessions to Alfred Mission Control activities database
# Optimized: batch inserts + mtime-based delta
# Run via cron every 5 minutes: */5 * * * * ubuntu /path/to/sync-openclaw-sessions.sh

OPENCLAW_DIR="${OPENCLAW_DIR:-/home/ubuntu/.openclaw}"
MISSION_CONTROL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MISSION_CONTROL_DB="${MISSION_CONTROL_DB:-$MISSION_CONTROL_DIR/data/activities.db}"
STATE_FILE="${MISSION_CONTROL_DIR}/data/.sessions-sync-state"
OPENCLAW_CONFIG="$OPENCLAW_DIR/openclaw.json"

command -v sqlite3 >/dev/null 2>&1 || exit 1
command -v jq >/dev/null 2>&1 || exit 1
[ -f "$MISSION_CONTROL_DB" ] || exit 1

mkdir -p "$(dirname "$STATE_FILE")"

CONFIGURED_CHANNELS=""
if [ -f "$OPENCLAW_CONFIG" ]; then
    CONFIGURED_CHANNELS=$(jq -r '.channels | keys[]' "$OPENCLAW_CONFIG" 2>/dev/null | tr '\n' '|' | sed 's/|$//')
fi

sqlite3 "$MISSION_CONTROL_DB" "CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INTEGER,
  tokens_used INTEGER,
  agent TEXT,
  metadata TEXT
);"
sqlite3 "$MISSION_CONTROL_DB" "CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);"
sqlite3 "$MISSION_CONTROL_DB" "CREATE INDEX IF NOT EXISTS idx_activities_agent ON activities(agent);"

LAST_SYNC=0
[ -f "$STATE_FILE" ] && LAST_SYNC=$(cat "$STATE_FILE" 2>/dev/null || echo 0)

sessions_added=0
batch=""

for agent_dir in "$OPENCLAW_DIR"/agents/*/; do
    [ -d "$agent_dir" ] || continue
    
    agent_id=$(basename "$agent_dir")
    sessions_file="$agent_dir/sessions/sessions.json"

    [ -f "$sessions_file" ] || continue
    
    # Delta: skip if not modified
    file_mtime=$(stat -c%Y "$sessions_file" 2>/dev/null || echo 0)
    [ "$file_mtime" -le "$LAST_SYNC" ] && continue

    # Parse sessions
    while IFS= read -r activity; do
        [ -z "$activity" ] && continue

        id=$(echo "$activity" | jq -r '.id' 2>/dev/null)
        timestamp=$(echo "$activity" | jq -r '.timestamp' 2>/dev/null)
        atype=$(echo "$activity" | jq -r '.type' 2>/dev/null)
        description=$(echo "$activity" | jq -r '.description' 2>/dev/null | sed "s/'/''/g")
        agent=$(echo "$activity" | jq -r '.agent' 2>/dev/null | sed "s/'/''/g")
        metadata=$(echo "$activity" | jq -c '.metadata' 2>/dev/null | sed "s/'/''/g")

        [ -z "$id" ] || [ "$id" = "null" ] && continue

        id_esc=$(echo "$id" | sed "s/'/''/g")
        ts_esc=$(echo "$timestamp" | sed "s/'/''/g")

        batch="${batch}INSERT OR IGNORE INTO activities (id, timestamp, type, description, status, agent, metadata) VALUES ('${id_esc}', '${ts_esc}', '${atype}', '${description}', 'success', '${agent}', '${metadata}');"$'\n'
        ((sessions_added++))
        
    done < <(jq -r --arg agent "$agent_id" --arg configured "$CONFIGURED_CHANNELS" '
        to_entries[] |
        .value as $session |
        (
            if $session.deliveryContext.channel then
                $session.deliveryContext.channel
            elif $session.origin.provider then
                $session.origin.provider
            else
                $session.lastChannel // "unknown"
            end
        ) as $rawChannel |
        (if ($configured == "" or ($configured | test($rawChannel))) then
            $rawChannel
        else
            "test"
        end) as $actualChannel |
        {
            id: $session.sessionId,
            timestamp: ($session.updatedAt | tonumber / 1000 | strftime("%Y-%m-%dT%H:%M:%S.000Z")),
            type: "session",
            description: "Chat session via \($actualChannel)",
            status: "success",
            agent: $agent,
            metadata: {
                channel: $actualChannel,
                chatType: ($session.chatType // "direct"),
                from: ($session.origin.from // null)
            }
        } |
        @json
    ' "$sessions_file" 2>/dev/null)
done

if [ -n "$batch" ]; then
    echo -n "$batch" | sqlite3 "$MISSION_CONTROL_DB" 2>/dev/null
fi

date +%s > "$STATE_FILE"

cutoff=$(date -d "30 days ago" -u +"%Y-%m-%dT%H:%M:%S.000Z")
pruned=$(sqlite3 "$MISSION_CONTROL_DB" "DELETE FROM activities WHERE timestamp < '$cutoff'; SELECT changes();")

echo "✓ Synced $sessions_added new sessions, pruned $pruned old records"
