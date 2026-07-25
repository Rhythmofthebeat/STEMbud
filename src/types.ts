export interface Citation {
  filename: string;
  quote?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  uploadedFile?: { name: string };
  isStreaming?: boolean;
  error?: string;
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
  minutesRequired: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface UploadedFile {
  fileId: string;
  filename: string;
}

export interface ConversationSummary {
  id: string;
  updatedAt: string;
  preview: string;
}
