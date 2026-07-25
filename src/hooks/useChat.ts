import { useState, useCallback, useEffect } from 'react';
import type { Message, Citation } from '../types';
import { supabase } from '../lib/supabase';

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}-${Date.now()}`;

export function useChat(userId: string | null, accessToken: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [previousResponseId, setPreviousResponseId] = useState<string | undefined>();
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Load the user's most recent conversation on login
  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setConversationId(null);
      setPreviousResponseId(undefined);
      setIsHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setIsHistoryLoading(true);

    (async () => {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, previous_response_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!conversation) {
        setIsHistoryLoading(false);
        return;
      }

      const { data: rows } = await supabase
        .from('messages')
        .select('id, role, content, citations, uploaded_file_name')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      setConversationId(conversation.id);
      setPreviousResponseId(conversation.previous_response_id ?? undefined);
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
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const persistMessage = useCallback(
    async (convId: string, msg: Message) => {
      if (!userId) return;
      await supabase.from('messages').insert({
        id: msg.id,
        conversation_id: convId,
        user_id: userId,
        role: msg.role,
        content: msg.content,
        citations: msg.citations ?? null,
        uploaded_file_name: msg.uploadedFile?.name ?? null,
      });
    },
    [userId]
  );

  const sendMessage = useCallback(
    async (text: string, uploadedFileId?: string, uploadedFileName?: string) => {
      if (!text.trim() || isLoading || !userId) return;

      let convId = conversationId;
      if (!convId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({ user_id: userId })
          .select('id')
          .single();
        if (error || !data) return;
        convId = data.id;
        setConversationId(convId);
      }
      if (!convId) return;
      const activeConvId: string = convId;

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
      void persistMessage(activeConvId, userMsg);

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
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
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
              if (event.responseId) {
                setPreviousResponseId(event.responseId);
                await supabase
                  .from('conversations')
                  .update({ previous_response_id: event.responseId, updated_at: new Date().toISOString() })
                  .eq('id', activeConvId);
              }
              await persistMessage(activeConvId, { ...assistantMsg, content: accText, citations });
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
    [isLoading, previousResponseId, userId, conversationId, accessToken, persistMessage]
  );

  const generateQuiz = useCallback(() => {
    sendMessage(
      "Based on everything we've discussed so far, generate a short quiz (4-6 questions) focused on the topics I've struggled with the most. Mix multiple-choice and short-answer questions, and include an answer key with brief explanations at the end."
    );
  }, [sendMessage]);

  return { messages, sendMessage, generateQuiz, isLoading, isHistoryLoading };
}
