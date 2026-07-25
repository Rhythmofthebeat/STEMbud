import { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';

interface Props {
  open: boolean;
  notes: Note[];
  onCreate: () => Promise<Note>;
  onUpdate: (id: string, patch: { title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotebookPanel({ open, notes, onCreate, onUpdate, onDelete, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);

  const editingNote = notes.find((n) => n.id === editingId) ?? null;

  useEffect(() => {
    if (!editingNote) return;
    skipNextSave.current = true;
    setTitle(editingNote.title);
    setContent(editingNote.content);
  }, [editingId]); // eslint-disable-line

  useEffect(() => {
    if (!editingId) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(editingId, { title: title.trim() || 'Untitled note', content });
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, content]); // eslint-disable-line

  const handleNewNote = async () => {
    const note = await onCreate();
    setEditingId(note.id);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    if (editingId === id) setEditingId(null);
  };

  const handleDeleteFromList = (n: Note) => {
    if (window.confirm(`Delete "${n.title || 'Untitled note'}"? This can't be undone.`)) {
      onDelete(n.id);
    }
  };

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`notebook-panel ${open ? 'open' : ''}`}>
        {editingNote ? (
          <>
            <div className="sidebar-header">
              <button className="notebook-back" onClick={() => setEditingId(null)}>
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                  <path d="M12 15 7 10l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Notes
              </button>
              <button className="sidebar-close" onClick={onClose} aria-label="Close notebook">×</button>
            </div>
            <input
              className="notebook-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
            />
            <textarea
              className="notebook-content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notes here…"
            />
            <button className="notebook-delete" onClick={() => handleDelete(editingNote.id)}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="13" height="13">
                <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0v9.5A1.5 1.5 0 0 1 12.5 17h-5A1.5 1.5 0 0 1 6 15.5V6h8Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete note
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-header">
              <span className="sidebar-title">Notebook</span>
              <button className="sidebar-close" onClick={onClose} aria-label="Close notebook">×</button>
            </div>

            <button className="sidebar-new-chat" onClick={handleNewNote}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              New note
            </button>

            <div className="sidebar-list">
              {notes.length === 0 && (
                <div className="sidebar-empty">No notes yet — jot something down.</div>
              )}
              {notes.map((n) => (
                <div key={n.id} className="sidebar-item">
                  <button className="sidebar-item-main" onClick={() => setEditingId(n.id)}>
                    <span className="sidebar-item-preview">{n.title || 'Untitled note'}</span>
                    <span className="sidebar-item-time">{relativeTime(n.updatedAt)}</span>
                  </button>
                  <button
                    className="notebook-item-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteFromList(n); }}
                    title="Delete note"
                    aria-label="Delete note"
                  >
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="13" height="13">
                      <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0v9.5A1.5 1.5 0 0 1 12.5 17h-5A1.5 1.5 0 0 1 6 15.5V6h8Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
