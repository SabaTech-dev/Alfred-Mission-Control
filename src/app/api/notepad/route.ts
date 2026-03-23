import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const NOTEPAD_FILE = path.join(process.cwd(), 'data', 'notepad.json');

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

async function readNotes(): Promise<Note[]> {
  try {
    const data = await fs.readFile(NOTEPAD_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeNotes(notes: Note[]): Promise<void> {
  await fs.mkdir(path.dirname(NOTEPAD_FILE), { recursive: true });
  await fs.writeFile(NOTEPAD_FILE, JSON.stringify(notes, null, 2));
}

export async function GET() {
  try {
    const notes = await readNotes();
    // Sort by updatedAt descending
    const sorted = notes.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return NextResponse.json(sorted);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const notes = await readNotes();

    const note: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: body.title || 'Sin título',
      content: body.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    notes.push(note);
    await writeNotes(notes);
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const notes = await readNotes();
    const index = notes.findIndex(n => n.id === body.id);

    if (index === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    notes[index] = {
      ...notes[index],
      title: body.title || notes[index].title,
      content: body.content ?? notes[index].content,
      updatedAt: new Date().toISOString(),
    };

    await writeNotes(notes);
    return NextResponse.json(notes[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID required' }, { status: 400 });
    }

    const notes = await readNotes();
    const filtered = notes.filter(n => n.id !== id);
    await writeNotes(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
