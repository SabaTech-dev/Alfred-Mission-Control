#!/usr/bin/env bash
#
# Cleanup script: Remove duplicate opportunities from kanban.db
#
# Dedup strategy:
# - Group by LOWER(TRIM(company))
# - For each group, keep the OLDEST entry (lowest created_at)
# - Delete all newer duplicates
#
# Usage:
#   ./scripts/cleanup-duplicate-opportunities.sh [--dry-run] [--db /path/to/kanban.db]
#
# Options:
#   --dry-run    Show what would be deleted without deleting
#   --db PATH    Path to kanban.db (default: data/kanban.db)

set -euo pipefail

# Parse args
DRY_RUN=false
DB_PATH="data/kanban.db"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        --db) DB_PATH="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ ! -f "$DB_PATH" ]]; then
    echo "❌ Database not found: $DB_PATH"
    exit 1
fi

echo "📦 Database: $DB_PATH"
if $DRY_RUN; then
    echo "🔍 DRY RUN — no changes will be made"
else
    echo "🗑️  LIVE MODE — duplicates WILL be deleted"
fi
echo ""

# Get stats
TOTAL=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM opportunities;")
UNIQUE=$(sqlite3 "$DB_PATH" "SELECT COUNT(DISTINCT LOWER(TRIM(company))) FROM opportunities;")
DUPES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) - COUNT(DISTINCT LOWER(TRIM(company))) FROM opportunities;")

echo "📊 Total opportunities: $TOTAL"
echo "📈 Unique companies: $UNIQUE"
echo "🔁 Duplicates to remove: $DUPES"
echo ""

if [[ "$DUPES" -eq 0 ]]; then
    echo "✅ No duplicates found. Database is clean."
    exit 0
fi

# Show top offenders
echo "Top duplicate offenders:"
sqlite3 -header -column "$DB_PATH" "
    SELECT company, COUNT(*) as entries, COUNT(*) - 1 as to_remove
    FROM opportunities
    GROUP BY LOWER(TRIM(company))
    HAVING COUNT(*) > 1
    ORDER BY entries DESC
    LIMIT 15;
"
echo ""

if $DRY_RUN; then
    echo "🔍 DRY RUN — showing entries that would be deleted (first 30):"
    sqlite3 -header -column "$DB_PATH" "
        SELECT o.id, o.company, SUBSTR(o.title, 1, 40) as title, o.stage, o.value, o.created_at
        FROM opportunities o
        WHERE o.id NOT IN (
            SELECT MIN(o2.id)
            FROM opportunities o2
            GROUP BY LOWER(TRIM(o2.company))
        )
        ORDER BY o.company, o.created_at
        LIMIT 30;
    "
    echo ""
    echo "✅ DRY RUN complete. No changes made."
    echo "Run without --dry-run to actually delete duplicates."
else
    # Delete duplicates — keep the oldest (MIN(id)) per company
    DELETED=$(sqlite3 "$DB_PATH" "
        DELETE FROM opportunities
        WHERE id NOT IN (
            SELECT MIN(o.id)
            FROM opportunities o
            GROUP BY LOWER(TRIM(o.company))
        );
        SELECT changes();
    ")
    echo "✅ Deleted $DELETED duplicate opportunities"

    # Verify
    REMAINING=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM opportunities;")
    echo "📊 Remaining opportunities: $REMAINING"

    # Check for remaining duplicates
    STILL_DUPES=$(sqlite3 "$DB_PATH" "
        SELECT COUNT(*) FROM (
            SELECT LOWER(TRIM(company)) as key
            FROM opportunities
            GROUP BY key
            HAVING COUNT(*) > 1
        );
    ")
    if [[ "$STILL_DUPES" -eq 0 ]]; then
        echo "✅ No more duplicates by company."
    else
        echo "⚠️  Still have $STILL_DUPES company groups with duplicates"
    fi
fi
