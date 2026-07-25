import type { Message } from '../types';
import CitationBlock from './CitationBlock';
import MarkdownMessage from './MarkdownMessage';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`msg-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="msg-avatar stemmy">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <circle cx="18" cy="18" r="4" fill="white"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none" transform="rotate(60 18 18)"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none" transform="rotate(120 18 18)"/>
          </svg>
        </div>
      )}

      <div className="msg-body">
        {message.uploadedFile && (
          <span className="upload-chip">📎 {message.uploadedFile.name}</span>
        )}
        <div className={`msg-bubble ${isUser ? 'user' : 'assistant'} ${message.error ? 'error-bubble' : ''} ${message.isStreaming && message.content ? 'streaming-cursor' : ''}`}>
          {message.isStreaming && !message.content
            ? <span className="thinking-text">Thinking…</span>
            : <MarkdownMessage content={message.content || '…'} isUser={isUser} />
          }
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationBlock citations={message.citations} />
        )}
      </div>

      {isUser && (
        <div className="msg-avatar user-av">🎓</div>
      )}
    </div>
  );
}
