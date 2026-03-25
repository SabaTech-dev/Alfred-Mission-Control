#!/bin/bash
# Sync OpenClaw messages to Alfred Mission Control activities database
# Optimized: batch sqlite inserts + mtime-based delta (only new/modified files)
# Run via cron every 5 minutes: */5 * * * * ubuntu /path/to/sync-openclaw-activities.sh

OPENCLAW_DIR="${OPENCLAW_DIR:-/home/ubuntu/.openclaw}"
MISSION_CONTROL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MISSION_CONTROL_DB="${MISSION_CONTROL_DB:-$MISSION_CONTROL_DIR/data/activities.db}"
STATE_FILE="${MISSION_CONTROL_DIR}/data/.activities-sync-state"
MAX_FILE_SIZE=52428800  # 50MB

command -v sqlite3 >/dev/null 2>&1 || exit 1
command -v jq >/dev/null 2>&1 || exit 1
[ -f "$MISSION_CONTROL_DB" ] || exit 1

mkdir -p "$(dirname "$STATE_FILE")"

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

# Read last sync timestamp
LAST_SYNC=0
[ -f "$STATE_FILE" ] && LAST_SYNC=$(cat "$STATE_FILE" 2>/dev/null || echo 0)

total=0
for jsonl_file in "$OPENCLAW_DIR"/agents/*/sessions/*.jsonl; do
    [ -f "$jsonl_file" ] || continue
    
    # Delta: skip files not modified since last sync
    file_mtime=$(stat -c%Y "$jsonl_file" 2>/dev/null || echo 0)
    [ "$file_mtime" -le "$LAST_SYNC" ] && continue
    
    filesize=$(stat -c%s "$jsonl_file" 2>/dev/null || echo 0)
    [ "$filesize" -gt "$MAX_FILE_SIZE" ] && continue
    [ "$filesize" -eq 0 ] && continue

    agent=$(basename "$(dirname "$(dirname "$jsonl_file")")")
    session=$(basename "$jsonl_file" .jsonl)
    
    # Build batch SQL from all messages in this file
    batch=""
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        
        id=$(echo "$line" | jq -r '.id' 2>/dev/null)
        timestamp=$(echo "$line" | jq -r '.timestamp' 2>/dev/null)
        role=$(echo "$line" | jq -r '.message.role // empty' 2>/dev/null)
        
        [ -z "$id" ] || [ -z "$timestamp" ] || [ -z "$role" ] && continue
        
        if [ "$role" = "user" ]; then
            atype="message_sent"
            desc="User message"
        else
            atype="message_received"
            desc="Agent response"
        fi
        
        id_esc=$(echo "$id" | sed "s/'/''/g")
        ts_esc=$(echo "$timestamp" | sed "s/'/''/g")
        agent_esc=$(echo "$agent" | sed "s/'/''/g")
        meta_esc="{\"role\":\"$(echo "$role" | sed "s/'/''/g")\",\"session\":\"$(echo "$session" | sed "s/'/''/g")\"}"
        
        batch="${batch}INSERT OR IGNORE INTO activities (id, timestamp, type, description, status, agent, metadata) VALUES ('${id_esc}', '${ts_esc}', '${atype}', '${desc}', 'success', '${agent_esc}', '${meta_esc}');"$'\n'
        
    done < <(jq -c 'select(.type == "message" and .message.role != null)' "$jsonl_file" 2>/dev/null)
    
    # Execute batch for this file
    if [ -n "$batch" ]; then
        echo -n "$batch" | sqlite3 "$MISSION_CONTROL_DB" 2>/dev/null
        file_count=$(echo "$batch" | wc -l)
        total=$((total + file_count))
    fi
done

# Update sync state
date +%s > "$STATE_FILE"

# Prune old activities (30 days)
cutoff=$(date -d "30 days ago" -u +"%Y-%m-%dT%H:%M:%S")
sqlite3 "$MISSION_CONTROL_DB" "DELETE FROM activities WHERE timestamp < '$cutoff';" 2>/dev/null

echo "✓ Synced $total activities"
