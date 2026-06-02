"use client";

import { authFetch } from "@/lib/auth-fetch";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Trash2,
  Download,
  X,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotepadPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await authFetch('/api/notepad');
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedNote]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async () => {
    try {
      const res = await authFetch('/api/notepad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', content: '' }),
      });
      const note = await res.json();
      setNotes([note, ...notes]);
      setSelectedNote(note);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const saveNote = useCallback(async (note: Note) => {
    setSaving(true);
    try {
      await authFetch('/api/notepad', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
      setNotes(notes.map(n => n.id === note.id ? note : n));
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  }, [notes]);

  const updateNote = (updates: Partial<Note>) => {
    if (!selectedNote) return;

    const updated = { ...selectedNote, ...updates };
    setSelectedNote(updated);

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(updated);
    }, 3000);
  };

  const deleteNote = async (id: string) => {
    try {
      await authFetch(`/api/notepad?id=${id}`, { method: 'DELETE' });
      const filtered = notes.filter(n => n.id !== id);
      setNotes(filtered);
      if (selectedNote?.id === id) {
        setSelectedNote(filtered[0] || null);
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const exportNote = (note: Note) => {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold mb-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
                letterSpacing: '-1.5px'
              }}
            >
              📝 Notepad
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Quick capture for your second brain
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
                Saving...
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg transition-all md:hidden"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar - Notes List */}
        <div
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } flex-shrink-0 transition-all duration-300 overflow-hidden`}
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
          }}
        >
          <div className="w-64 h-full flex flex-col">
            {/* Search & New */}
            <div className="p-3 space-y-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--card-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <button
                onClick={createNote}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--text-primary)',
                }}
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3 rounded-lg cursor-pointer transition-all group ${
                    selectedNote?.id === note.id ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: selectedNote?.id === note.id ? 'var(--accent)' : 'var(--card-elevated)',
                    color: selectedNote?.id === note.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    outlineColor: 'var(--accent)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ color: selectedNote?.id === note.id ? 'var(--text-primary)' : 'var(--text-primary)' }}
                      >
                        {note.title || 'Sin título'}
                      </p>
                      <p
                        className="text-xs mt-1 truncate"
                        style={{ color: selectedNote?.id === note.id ? 'var(--text-primary)' : 'var(--text-muted)', opacity: selectedNote?.id === note.id ? 0.8 : 1 }}
                      >
                        {note.content.slice(0, 50) || 'Empty note...'}
                      </p>
                      <p
                        className="text-xs mt-1 flex items-center gap-1"
                        style={{ color: selectedNote?.id === note.id ? 'var(--text-primary)' : 'var(--text-muted)', opacity: 0.6 }}
                      >
                        <Clock className="w-3 h-3" />
                        {formatDate(note.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-red-500/20"
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Confirmation */}
                  {deleteConfirm === note.id && (
                    <div
                      className="mt-2 p-2 rounded flex items-center justify-between gap-2"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs" style={{ color: 'var(--error)' }}>Delete?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: 'var(--error)', color: 'white' }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: 'var(--card-elevated)', color: 'var(--text-secondary)' }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notes found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div
          className="flex-1 rounded-xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {selectedNote ? (
            <>
              {/* Editor Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => updateNote({ title: e.target.value })}
                  placeholder="Note title..."
                  className="flex-1 text-lg font-semibold bg-transparent border-none outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={() => exportNote(selectedNote)}
                  className="p-2 rounded-lg transition-all hover:bg-green-500/20"
                  style={{ color: 'var(--success)' }}
                  title="Export as Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Editor Content */}
              <textarea
                value={selectedNote.content}
                onChange={(e) => updateNote({ content: e.target.value })}
                placeholder="Start writing... (auto-saves every 3 seconds)"
                className="flex-1 w-full p-4 resize-none bg-transparent border-none outline-none"
                style={{ color: 'var(--text-primary)' }}
              />

              {/* Editor Footer */}
              <div
                className="px-4 py-2 flex items-center justify-between text-xs"
                style={{
                  borderTop: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  Created: {new Date(selectedNote.createdAt).toLocaleString()}
                </span>
                <span>
                  Last saved: {formatDate(selectedNote.updatedAt)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a note or create a new one</p>
                <button
                  onClick={createNote}
                  className="mt-3 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Plus className="inline-block w-4 h-4 mr-1" />
                  New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
