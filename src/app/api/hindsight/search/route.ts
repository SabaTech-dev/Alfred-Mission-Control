/**
 * Hindsight semantic search API
 * GET /api/hindsight/search?q=<query>&bank=<bank>
 *
 * Wraps the Hindsight CLI memory recall command
 */
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);

interface HindsightResult {
  id: string;
  chunk_id: string;
  document_id: string;
  text: string;
  type: 'world' | 'experience' | 'observation';
  entities: string[];
  tags: string[];
  occurred_start: string;
  occurred_end: string;
  mentioned_at: string;
  context: string;
  metadata: Record<string, string>;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const bank = searchParams.get('bank')?.trim() || 'alfred-coder::main';

  if (query.length < 2) {
    return NextResponse.json({ memories: [], query, total: 0 });
  }

  try {
    const { stdout, stderr } = await execAsync(
      `hindsight memory recall ${JSON.stringify(bank)} ${JSON.stringify(query)} -o json --max-tokens 4000`,
      { timeout: 30000 }
    );

    if (stderr && stderr.toLowerCase().includes('error')) {
      console.error('[hindsight/search] Hindsight error:', stderr);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const result = JSON.parse(stdout || '{}');
    const rawResults: HindsightResult[] = result.results || [];

    // Transform results for the UI
    const memories = rawResults.map((item) => {
      // Calculate relevance score
      let score = 0;
      const lowerText = item.text?.toLowerCase() || '';
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);

      // Text match score (0-50)
      for (const word of words) {
        const regex = new RegExp(word, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        score += Math.min(matches * 8, 50);
      }

      // Recency bonus (0-30)
      try {
        const memDate = new Date(item.occurred_start || item.mentioned_at);
        const now = new Date();
        const daysOld = Math.floor((now.getTime() - memDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOld < 1) score += 30;
        else if (daysOld < 7) score += 20;
        else if (daysOld < 30) score += 10;
      } catch {}

      // Fact type bonus (0-10)
      if (item.type === 'experience') score += 10;
      else if (item.type === 'world') score += 5;

      return {
        id: item.id,
        text: item.text,
        date: item.occurred_start || item.mentioned_at || '',
        fact_type: item.type,
        entities: (item.entities || []).join(', '),
        tags: item.tags || [],
        score: Math.min(score, 100),
        document_id: item.document_id,
        mentioned_at: item.mentioned_at,
        metadata: item.metadata,
      };
    });

    // Sort by score descending
    const sorted = memories.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      memories: sorted,
      query,
      total: sorted.length,
    });
  } catch (error) {
    console.error('[hindsight/search] Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
