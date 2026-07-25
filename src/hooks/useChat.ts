import { useState, useCallback } from 'react';
import type { Message, Citation } from '../types';

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}-${Date.now()}`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState<string | undefined>();

  const sendMessage = useCallback(
    async (text: string, uploadedFileId?: string, uploadedFileName?: string) => {
      if (!text.trim() || isLoading) return;

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

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
              if (event.responseId) setPreviousResponseId(event.responseId);
              const citations = event.citations ?? [];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: accText, isStreaming: false, citations }
                    : m
                )
              );
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
    [isLoading, previousResponseId]
  );

  return { messages, sendMessage, isLoading };
}
