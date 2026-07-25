import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabase';
import MessageBubble from './MessageBubble';
import type { Message, Citation } from '../types';

interface Props {
  token: string;
}

export default function SharedConversationView({ token }: Props) {
  const [theme] = useTheme();
  const [title, setTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found'>('loading');

  useEffect(() => {
    (async () => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('share_token', token)
        .maybeSingle();

      if (!conv) {
        setStatus('not_found');
        return;
      }
      setTitle(conv.title);

      const { data: rows } = await supabase
        .from('messages')
        .select('id, role, content, citations, uploaded_file_name')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      setMessages(
        (rows ?? []).map((r) => ({
          id: r.id,
          role: r.role as 'user' | 'assistant',
          content: r.content,
          citations: (r.citations as Citation[] | null) ?? undefined,
          uploadedFile: r.uploaded_file_name ? { name: r.uploaded_file_name } : undefined,
        }))
      );
      setStatus('ready');
    })();
  }, [token]);

  if (status === 'loading') {
    return <div className="app" data-theme={theme} />;
  }

  if (status === 'not_found') {
    return (
      <div className="app" data-theme={theme}>
        <div className="welcome">
          <div className="welcome-card">
            <div className="welcome-avatar">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                <circle cx="18" cy="18" r="4" fill="white"/>
                <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none"/>
                <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none" transform="rotate(60 18 18)"/>
                <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none" transform="rotate(120 18 18)"/>
              </svg>
            </div>
            <h1 className="welcome-name">Link not found</h1>
            <p className="welcome-msg">This shared conversation doesn't exist, or is no longer being shared.</p>
            <a className="auth-submit" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }} href="/">
              Go to STEMMY
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
              <circle cx="18" cy="18" r="4" fill="white"/>
              <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none"/>
              <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none" transform="rotate(60 18 18)"/>
              <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none" transform="rotate(120 18 18)"/>
            </svg>
          </div>
          <div className="header-info">
            <div className="header-title">{title ?? 'Shared conversation'}</div>
            <div className="header-subtitle">Shared from STEMMY · read-only</div>
          </div>
        </div>
      </header>

      <div className="chat-main">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="shared-footer">
        <a href="/" className="auth-inline-link">Ask your own question on STEMMY →</a>
      </div>
    </div>
  );
}
