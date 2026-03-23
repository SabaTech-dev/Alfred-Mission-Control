import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const workspaceMemory = path.join(process.cwd(), '..', '..', 'memory', `${dateStr}.md`);
    
    let content = '';
    try {
      content = await fs.readFile(workspaceMemory, 'utf-8');
    } catch {
      return NextResponse.json({
        found: false,
        date: dateStr,
        tasks: [],
        completed: [],
        notes: [],
      });
    }

    const lines = content.split('\n');
    const tasks: string[] = [];
    const completed: string[] = [];
    const notes: string[] = [];
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Track sections
      if (trimmed.startsWith('## ')) {
        currentSection = trimmed.toLowerCase();
      }
      
      // Parse checkboxes
      if (trimmed.startsWith('- [ ]')) {
        tasks.push(trimmed.replace('- [ ] ', ''));
      } else if (trimmed.startsWith('- [x]')) {
        completed.push(trimmed.replace('- [x] ', ''));
      } else if (trimmed.startsWith('- ') && !trimmed.startsWith('- [')) {
        // Regular notes (not checkboxes)
        if (currentSection.includes('nota') || currentSection.includes('note') || currentSection.includes('important')) {
          notes.push(trimmed.replace('- ', ''));
        }
      }
    }

    return NextResponse.json({
      found: true,
      date: dateStr,
      tasks,
      completed,
      notes,
      raw: content,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read daily brief' }, { status: 500 });
  }
}
