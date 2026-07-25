import type { Message } from '../types';
import CitationBlock from './CitationBlock';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`msg-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`msg-avatar ${isUser ? 'user-av' : 'stemmy'}`}>
        {isUser ? '🎓' : '⚛️'}
      </div>
      <div className="msg-body">
        {message.uploadedFile && (
          <span className="upload-chip">📎 {message.uploadedFile.name}</span>
        )}
        <div
          className={`msg-bubble ${isUser ? 'user' : 'assistant'} ${
            message.error ? 'error-bubble' : ''
          } ${message.isStreaming && message.content ? 'streaming-cursor' : ''}`}
        >
          {message.content || (message.isStreaming ? '' : '…')}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationBlock citations={message.citations} />
        )}
      </div>
    </div>
  );
}
