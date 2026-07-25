import { useState, type KeyboardEvent } from 'react';
import type { ConversationSummary } from '../types';

interface Props {
  open: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => Promise<string | null>;
  onUnshare: (id: string) => void;
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

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
}

export default function Sidebar({
  open, conversations, activeId, onSelect, onNewChat, onRename, onPin, onArchive, onDelete, onShare, onUnshare, onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

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

  const handleShare = async (c: ConversationSummary) => {
    const token = await onShare(c.id);
    if (!token) return;
    copyToClipboard(`${window.location.origin}/shared/${token}`);
    setJustCopiedId(c.id);
    setTimeout(() => setJustCopiedId((cur) => (cur === c.id ? null : cur)), 1500);
  };

  const handleDelete = (c: ConversationSummary) => {
    setMenuOpenId(null);
    if (window.confirm(`Delete "${c.preview}"? This can't be undone.`)) {
      onDelete(c.id);
    }
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
                    <span className="sidebar-item-title-row">
                      {c.pinned && (
                        <svg className="sidebar-item-pin-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                          <path d="M10 2 8 8l-4 1.5L9 14l.5 4 4.5-4.5 4-1.5L13 8l-3-6Z" fill="currentColor"/>
                        </svg>
                      )}
                      <span className="sidebar-item-preview">{c.preview}</span>
                    </span>
                    <span className="sidebar-item-time">{relativeTime(c.updatedAt)}</span>
                  </button>
                  <div className="sidebar-item-menu-wrap">
                    <button
                      className="sidebar-item-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
                      title="More options"
                      aria-label="More options"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                        <circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/>
                      </svg>
                    </button>
                    {menuOpenId === c.id && (
                      <>
                        <div className="menu-backdrop" onClick={() => setMenuOpenId(null)} />
                        <div className="sidebar-item-menu">
                          <button onClick={() => handleShare(c)}>
                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                              <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M4 12v2.5A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                            {justCopiedId === c.id ? 'Link copied!' : c.shareToken ? 'Copy share link' : 'Share'}
                          </button>
                          {c.shareToken && (
                            <button onClick={() => { onUnshare(c.id); setMenuOpenId(null); }}>
                              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                                <path d="M4 4l12 12M8 5.2A6 6 0 0 1 16 10c-.4.9-1 1.7-1.7 2.4M6.3 6.6C4.9 7.5 4 8.7 4 10c1.4 3 4 5 6 5 .8 0 1.6-.2 2.4-.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Stop sharing
                            </button>
                          )}
                          <button onClick={() => { startRename(c); setMenuOpenId(null); }}>
                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                              <path d="M13.5 3.5a1.5 1.5 0 0 1 2.12 2.12L7 14.25l-3 .75.75-3 8.75-8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Rename
                          </button>
                          <button onClick={() => { onPin(c.id, !c.pinned); setMenuOpenId(null); }}>
                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                              <path d="M10 2 8 8l-4 1.5L9 14l.5 4 4.5-4.5 4-1.5L13 8l-3-6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                            </svg>
                            {c.pinned ? 'Unpin chat' : 'Pin chat'}
                          </button>
                          <button onClick={() => { onArchive(c.id); setMenuOpenId(null); }}>
                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                              <rect x="3" y="4" width="14" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                              <path d="M4.5 8v6A1.5 1.5 0 0 0 6 15.5h8A1.5 1.5 0 0 0 15.5 14V8M8.5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Archive
                          </button>
                          <button className="danger" onClick={() => handleDelete(c)}>
                            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                              <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0v9.5A1.5 1.5 0 0 1 12.5 17h-5A1.5 1.5 0 0 1 6 15.5V6h8Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
