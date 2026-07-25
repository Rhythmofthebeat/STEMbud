import { useState, useCallback, useEffect } from 'react';
import type { Message, Citation, ConversationSummary } from '../types';
import { supabase } from '../lib/supabase';

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}-${Date.now()}`;

const ANON_CHAT_KEY = 'stembud_anon_chat';

interface AnonChatState {
  messages: Message[];
  previousResponseId?: string;
}

function loadAnonChat(): AnonChatState {
  try {
    const raw = localStorage.getItem(ANON_CHAT_KEY);
    return raw ? (JSON.parse(raw) as AnonChatState) : { messages: [] };
  } catch { return { messages: [] }; }
}

function saveAnonChat(state: AnonChatState) {
  localStorage.setItem(ANON_CHAT_KEY, JSON.stringify(state));
}

function clearAnonChat() {
  localStorage.removeItem(ANON_CHAT_KEY);
}

async function generateTitle(
  conversationId: string,
  message: string,
  response: string,
  userId: string,
  accessToken: string | null
): Promise<void> {
  try {
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ message, response }),
    });
    if (!res.ok) return;
    const { title } = await res.json();
    if (title) await supabase.from('conversations').update({ title }).eq('id', conversationId).eq('user_id', userId);
  } catch {
    // Non-critical — the sidebar just falls back to the first-message preview.
  }
}

export function useChat(userId: string | null, accessToken: string | null, onRateLimited?: () => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [previousResponseId, setPreviousResponseId] = useState<string | undefined>();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [anonQuota, setAnonQuota] = useState<{ remaining: number; limit: number } | null>(null);

  const refreshConversations = useCallback(async (uid_: string) => {
    const { data: convRows } = await supabase
      .from('conversations')
      .select('id, title, updated_at, pinned, share_token')
      .eq('user_id', uid_)
      .eq('archived', false)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    const ids = (convRows ?? []).map((c) => c.id);
    const previews: Record<string, string> = {};

    if (ids.length) {
      const { data: firstMsgs } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', ids)
        .eq('role', 'user')
        .order('created_at', { ascending: true });

      for (const m of firstMsgs ?? []) {
        if (!previews[m.conversation_id]) previews[m.conversation_id] = m.content;
      }
    }

    setConversations(
      (convRows ?? []).map((c) => ({
        id: c.id,
        updatedAt: c.updated_at,
        preview: c.title ?? previews[c.id] ?? 'New conversation',
        pinned: c.pinned,
        shareToken: c.share_token,
      }))
    );
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsHistoryLoading(true);
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, previous_response_id')
      .eq('id', id)
      .maybeSingle();

    const { data: rows } = await supabase
      .from('messages')
      .select('id, role, content, citations, uploaded_file_name')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    setConversationId(id);
    setPreviousResponseId(conversation?.previous_response_id ?? undefined);
    setMessages(
      (rows ?? []).map((r) => ({
        id: r.id,
        role: r.role as 'user' | 'assistant',
        content: r.content,
        citations: (r.citations as Citation[] | null) ?? undefined,
        uploadedFile: r.uploaded_file_name ? { name: r.uploaded_file_name } : undefined,
      }))
    );
    setIsHistoryLoading(false);
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setPreviousResponseId(undefined);
    setMessages([]);
    if (!userId) clearAnonChat();
  }, [userId]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, preview: trimmed } : c)));
    await supabase.from('conversations').update({ title: trimmed }).eq('id', id);
  }, []);

  const pinConversation = useCallback(async (id: string, pinned: boolean) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, pinned } : c));
      return [...next].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    });
    await supabase.from('conversations').update({ pinned }).eq('id', id);
  }, []);

  const archiveConversation = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('conversations').update({ archived: true }).eq('id', id);
    setConversationId((current) => {
      if (current !== id) return current;
      setMessages([]);
      setPreviousResponseId(undefined);
      return null;
    });
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('conversations').delete().eq('id', id);
    setConversationId((current) => {
      if (current !== id) return current;
      setMessages([]);
      setPreviousResponseId(undefined);
      return null;
    });
  }, []);

  const shareConversation = useCallback(async (id: string): Promise<string | null> => {
    const existing = conversations.find((c) => c.id === id)?.shareToken;
    if (existing) return existing;
    const token = crypto.randomUUID();
    const { error } = await supabase.from('conversations').update({ share_token: token }).eq('id', id);
    if (error) return null;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shareToken: token } : c)));
    return token;
  }, [conversations]);

  const unshareConversation = useCallback(async (id: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, shareToken: null } : c)));
    await supabase.from('conversations').update({ share_token: null }).eq('id', id);
  }, []);

  // On sign-in, load the conversation list + jump into the most recent one.
  // Anonymous users get their last session restored from this browser's localStorage.
  useEffect(() => {
    if (!userId) {
      const saved = loadAnonChat();
      setMessages(saved.messages);
      setPreviousResponseId(saved.previousResponseId);
      setConversations([]);
      setConversationId(null);
      setIsHistoryLoading(false);
      return;
    }
    setAnonQuota(null);

    let cancelled = false;
    setIsHistoryLoading(true);

    (async () => {
      await refreshConversations(userId);
      if (cancelled) return;

      const { data: mostRecent } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (mostRecent) {
        await loadConversation(mostRecent.id);
      } else {
        // No saved conversation for this account — clear out anything left over
        // from an anonymous session rather than carrying it into the signed-in view.
        setMessages([]);
        setConversationId(null);
        setPreviousResponseId(undefined);
        setIsHistoryLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, refreshConversations, loadConversation]);

  // Anonymous sessions persist to this browser only, kept in sync as the conversation grows.
  // Debounced since `messages` updates on every streamed token.
  useEffect(() => {
    if (userId) return;
    const t = setTimeout(() => saveAnonChat({ messages, previousResponseId }), 400);
    return () => clearTimeout(t);
  }, [userId, messages, previousResponseId]);

  const persistMessage = useCallback(
    async (convId: string, msg: Message) => {
      if (!userId) return;
      // Note: `msg.id` is a client-generated string (e.g. "msg-1-...") used only for local
      // React state reconciliation — it's never sent here, since the messages table's `id`
      // is a uuid with its own default. History reloads use the DB's own ids instead.
      const { error } = await supabase.from('messages').insert({
        conversation_id: convId,
        user_id: userId,
        role: msg.role,
        content: msg.content,
        citations: msg.citations ?? null,
        uploaded_file_name: msg.uploadedFile?.name ?? null,
      });
      if (error) console.error('Failed to save message:', error.message);
    },
    [userId]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      uploadedFileId?: string,
      uploadedFileName?: string,
      uploadedFileKind?: 'document' | 'image'
    ) => {
      if (!text.trim() || isLoading) return;

      let activeConvId: string | null = conversationId;
      const isNewConversation = userId && !activeConvId;
      if (userId && !activeConvId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({ user_id: userId })
          .select('id')
          .single();
        if (!error && data) {
          activeConvId = data.id;
          setConversationId(activeConvId);
        }
      }

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: text,
        ...(uploadedFileName ? { uploadedFile: { name: uploadedFileName } } : {}),
      };

      const assistantMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: '',
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);
      if (userId && activeConvId) void persistMessage(activeConvId, userMsg);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            previousResponseId,
            uploadedFileId,
            uploadedFileKind,
          }),
        });

        const remainingHeader = res.headers.get('RateLimit-Remaining');
        const limitHeader = res.headers.get('RateLimit-Limit');
        if (remainingHeader !== null && limitHeader !== null) {
          setAnonQuota({ remaining: parseInt(remainingHeader, 10), limit: parseInt(limitHeader, 10) });
        } else if (userId) {
          setAnonQuota(null); // signed-in requests skip the limiter entirely — no cap to show
        }

        if (res.status === 429) {
          onRateLimited?.();
        }

        if (!res.ok || !res.body) {
          let errMsg = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            errMsg = body.message ?? body.error ?? errMsg;
          } catch { /* ignore */ }
          throw new Error(errMsg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event: { type: string; text?: string; responseId?: string; citations?: Citation[]; message?: string };
            try { event = JSON.parse(raw); } catch { continue; }

            if (event.type === 'delta' && event.text) {
              accText += event.text;
              const snapshot = accText;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: snapshot } : m
                )
              );
            } else if (event.type === 'done') {
              const citations = event.citations ?? [];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: accText, isStreaming: false, citations }
                    : m
                )
              );
              if (event.responseId) setPreviousResponseId(event.responseId);
              if (userId && activeConvId) {
                if (event.responseId) {
                  await supabase
                    .from('conversations')
                    .update({ previous_response_id: event.responseId, updated_at: new Date().toISOString() })
                    .eq('id', activeConvId);
                }
                await persistMessage(activeConvId, { ...assistantMsg, content: accText, citations });
                if (isNewConversation) {
                  void generateTitle(activeConvId, text, accText, userId, accessToken).then(() => refreshConversations(userId));
                } else {
                  void refreshConversations(userId);
                }
              }
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: event.message ?? 'An error occurred.', isStreaming: false, error: event.message }
                    : m
                )
              );
            }
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Network error';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: errMsg, isStreaming: false, error: errMsg }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, previousResponseId, userId, conversationId, accessToken, persistMessage, refreshConversations, onRateLimited]
  );

  const generateQuiz = useCallback(() => {
    sendMessage(
      "Based on everything we've discussed so far, generate a short quiz (4-6 questions) focused on the topics I've struggled with the most. Mix multiple-choice and short-answer questions. Do NOT include the answers yet — just number the questions and wait for me to answer them. Once I reply with my answers, grade them and walk through the correct answers with brief explanations."
    );
  }, [sendMessage]);

  return {
    messages,
    sendMessage,
    generateQuiz,
    isLoading,
    isHistoryLoading,
    conversations,
    conversationId,
    loadConversation,
    startNewConversation,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
    shareConversation,
    unshareConversation,
    anonQuota,
  };
}
