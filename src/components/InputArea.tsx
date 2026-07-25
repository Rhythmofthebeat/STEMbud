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
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
            <path d="M13.5 6.5 8.2 11.8a2 2 0 1 1-2.83-2.83l5.66-5.66a3.5 3.5 0 1 1 4.95 4.95l-6.36 6.36" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {uploadedFile.filename}
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
          placeholder="Ask a question, or attach your homework to get started…"
          rows={1}
          disabled={isLoading}
        />
        <div className="input-actions">
          <button
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isLoading}
            title="Attach a document (PDF, DOCX, TXT, or MD) for STEMMY to read"
          >
            {uploading ? (
              <svg className="spin" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
                <path d="M17 10a7 7 0 1 1-2.05-4.95" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
                <path d="M13.5 6.5 8.2 11.8a2 2 0 1 1-2.83-2.83l5.66-5.66a3.5 3.5 0 1 1 4.95 4.95l-6.36 6.36" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!canSend}
            title="Send (Enter)"
          >
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
              <path d="M17 3 2 9.5l6.2 2.3M17 3 8.2 11.8m8.8-8.8-3.2 13.8-5.4-5.7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx,.md"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
