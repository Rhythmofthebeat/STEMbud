import { useState, type KeyboardEvent } from 'react';
import type { ConversationSummary } from '../types';

interface Props {
  open: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
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

export default function Sidebar({ open, conversations, activeId, onSelect, onNewChat, onRename, onClose }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startRename = (c: ConversationSummary) => {
    setEditingId(c.id);
    setEditValue(c.preview);
  };

  const commitRename = () => {
    if (editingId) onRename(editingId, editValue);
    setEditingId(null);
  };

  const handleEditKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Your chats</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">×</button>
        </div>

        <button className="sidebar-new-chat" onClick={() => { onNewChat(); onClose(); }}>
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          New chat
        </button>

        <div className="sidebar-list">
          {conversations.length === 0 && (
            <div className="sidebar-empty">No saved chats yet — start one below.</div>
          )}
          {conversations.map((c) => (
            <div key={c.id} className={`sidebar-item ${c.id === activeId ? 'active' : ''}`}>
              {editingId === c.id ? (
                <input
                  className="sidebar-rename-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKey}
                  onBlur={commitRename}
                  autoFocus
                />
              ) : (
                <>
                  <button className="sidebar-item-main" onClick={() => { onSelect(c.id); onClose(); }}>
                    <span className="sidebar-item-preview">{c.preview}</span>
                    <span className="sidebar-item-time">{relativeTime(c.updatedAt)}</span>
                  </button>
                  <button
                    className="sidebar-item-rename"
                    onClick={(e) => { e.stopPropagation(); startRename(c); }}
                    title="Rename"
                    aria-label="Rename conversation"
                  >
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
                      <path d="M13.5 3.5a1.5 1.5 0 0 1 2.12 2.12L7 14.25l-3 .75.75-3 8.75-8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
