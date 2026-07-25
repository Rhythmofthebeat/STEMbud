import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';

interface Props {
  messages: Message[];
  isLoading: boolean;
}

export default function ChatInterface({ messages, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastIsStreaming = messages[messages.length - 1]?.isStreaming;
  const showTyping = isLoading && !lastIsStreaming;

  return (
    <div className="chat-main">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {showTyping && (
        <div className="typing-row">
          <div className="msg-avatar stemmy">⚛️</div>
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
