import type { ConversationSummary } from '../types';

interface Props {
  open: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
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

export default function Sidebar({ open, conversations, activeId, onSelect, onNewChat, onClose }: Props) {
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
            <button
              key={c.id}
              className={`sidebar-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => { onSelect(c.id); onClose(); }}
            >
              <span className="sidebar-item-preview">{c.preview}</span>
              <span className="sidebar-item-time">{relativeTime(c.updatedAt)}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
