import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent, type DragEvent } from 'react';
import type { UploadedFile } from '../types';
import CameraCapture from './CameraCapture';

interface Props {
  onSend: (text: string, fileId?: string, fileName?: string) => void;
  isLoading: boolean;
  uploadedFile: UploadedFile | null;
  onUpload: (file: UploadedFile) => void;
  onClearUpload: () => void;
  accessToken: string | null;
}

export default function InputArea({ onSend, isLoading, uploadedFile, onUpload, onClearUpload, accessToken }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const dragCounter = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: UploadedFile = await res.json();
      onUpload(data);
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }, [accessToken, onUpload]);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const { text: transcript } = await res.json();
      if (transcript) {
        setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    } catch (err) {
      alert(`Transcription failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTranscribing(false);
    }
  }, [accessToken]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) void transcribeAudio(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert('Microphone access is needed to use voice input.');
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const handleMicClick = () => {
    if (recording) stopRecording();
    else void startRecording();
  };

  const handleWorksheetCapture = async (blob: Blob) => {
    setCameraOpen(false);
    const file = new File([blob], `worksheet-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await uploadFile(file);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await uploadFile(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files') || isLoading || uploading) return;
    dragCounter.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (isLoading || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const canSend = text.trim().length > 0 && !isLoading && !uploading;

  return (
    <div
      className={`input-area ${isDragOver ? 'drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="drop-overlay">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
            <path d="M10 3v10M6 9l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          Drop your file here
        </div>
      )}
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
            onClick={() => setCameraOpen(true)}
            disabled={uploading || isLoading}
            title="Scan a worksheet with your camera"
          >
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H6l.6-1.4A1 1 0 0 1 7.5 4h5a1 1 0 0 1 .9.6L14 6h1.5A1.5 1.5 0 0 1 17 7.5v7A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <circle cx="10" cy="11" r="2.6" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
          <button
            className={`attach-btn ${recording ? 'mic-recording' : ''}`}
            onClick={handleMicClick}
            disabled={uploading || isLoading || transcribing}
            title={recording ? 'Stop recording' : 'Speak your question — any language'}
          >
            {transcribing ? (
              <svg className="spin" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
                <path d="M17 10a7 7 0 1 1-2.05-4.95" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
                <rect x="7.5" y="3" width="5" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 9.5a5 5 0 0 0 10 0M10 14.5V17M7.5 17h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <button
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isLoading}
            title="Attach a document or image for STEMbud to read, or drag and drop it here"
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
        accept=".pdf,.txt,.docx,.md,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {cameraOpen && (
        <CameraCapture onCapture={handleWorksheetCapture} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
}
