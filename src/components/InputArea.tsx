import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import type { UploadedFile } from '../types';

interface Props {
  onSend: (text: string, fileId?: string, fileName?: string) => void;
  isLoading: boolean;
  uploadedFile: UploadedFile | null;
  onUpload: (file: UploadedFile) => void;
  onClearUpload: () => void;
}

export default function InputArea({ onSend, isLoading, uploadedFile, onUpload, onClearUpload }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed, uploadedFile?.fileId, uploadedFile?.filename);
    setText('');
    onClearUpload();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isLoading, uploadedFile, onSend, onClearUpload]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // auto-resize
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data: UploadedFile = await res.json();
      onUpload(data);
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const canSend = text.trim().length > 0 && !isLoading && !uploading;

  return (
    <div className="input-area">
      {uploadedFile && (
        <div className="file-chip">
          📎 {uploadedFile.filename}
          <button className="file-chip-remove" onClick={onClearUpload} title="Remove file">×</button>
        </div>
      )}
      <div className="input-row">
        <textarea
          ref={textareaRef}
          className="input-field"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKey}
          placeholder="Ask STEMMY about your homework…"
          rows={1}
          disabled={isLoading}
        />
        <div className="input-actions">
          <button
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isLoading}
            title="Attach a document (PDF, txt, docx, md)"
          >
            {uploading ? '⏳' : '📎'}
          </button>
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!canSend}
            title="Send (Enter)"
          >
            ➤
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx,.md,.doc"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
