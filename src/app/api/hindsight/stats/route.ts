/**
 * Hindsight statistics API
 * GET /api/hindsight/stats?bank=<bank>
 *
 * Wraps the Hindsight CLI bank stats command
 */
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bank = searchParams.get('bank')?.trim() || 'alfred-coder::main';

  try {
    // Get bank stats
    const { stdout: statsStdout, stderr: statsStderr } = await execAsync(
      `hindsight bank stats ${JSON.stringify(bank)} -o json`,
      { timeout: 10000 }
    );

    if (statsStderr && statsStderr.toLowerCase().includes('error')) {
      console.error('[hindsight/stats] Hindsight error:', statsStderr);
      return NextResponse.json({ error: 'Stats fetch failed' }, { status: 500 });
    }

    const stats = JSON.parse(statsStdout || '{}');

    // Get last recall timestamp
    let lastRecall: string | undefined;
    try {
      const { stdout: listStdout } = await execAsync(
        `hindsight memory list ${JSON.stringify(bank)} -o json --limit 1`,
        { timeout: 10000 }
      );
      const memories = JSON.parse(listStdout || '{}');
      if (memories.items && memories.items.length > 0) {
        lastRecall = memories.items[0].mentioned_at || memories.items[0].occurred_start;
      }
    } catch {}

    // Get top entities
    const topCategories: string[] = [];
    try {
      const { stdout: entityStdout } = await execAsync(
        `hindsight entity list ${JSON.stringify(bank)} -o json --limit 10`,
        { timeout: 10000 }
      );
      const entities = JSON.parse(entityStdout || '{}');
      if (entities.items && Array.isArray(entities.items)) {
        topCategories.push(...entities.items.slice(0, 10).map((e: any) => e.canonical_name || e.entity_id));
      }
    } catch {}

    return NextResponse.json({
      ...stats,
      last_recall: lastRecall,
      top_categories: topCategories,
    });
  } catch (error) {
    console.error('[hindsight/stats] Error:', error);
    return NextResponse.json({ error: 'Stats fetch failed' }, { status: 500 });
  }
}
