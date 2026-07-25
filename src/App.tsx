import { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useAchievements } from './hooks/useAchievements';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import StarterQuestions from './components/StarterQuestions';
import AchievementBadges from './components/AchievementBadges';
import InputArea from './components/InputArea';
import type { UploadedFile } from './types';

interface AppConfig {
  assistant_name: string;
  vector_store_configured: boolean;
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { messages, sendMessage, isLoading } = useChat();
  const { achievements, newBadge, clearNewBadge } = useAchievements(messages.length);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // Fetch safe config from server
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setAppConfig)
      .catch(() => null);
  }, []);

  const handleSend = (text: string) => {
    sendMessage(text, uploadedFile?.fileId, uploadedFile?.filename);
    setUploadedFile(null);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="app" data-theme={theme}>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* Config warning — shown until vector store ID is set */}
      {appConfig && !appConfig.vector_store_configured && (
        <div className="config-banner">
          ⚠️{' '}
          <span>
            <strong>Vector store not configured.</strong> Open <code>config.json</code> and replace{' '}
            <code>YOUR_VECTOR_STORE_ID_HERE</code> with your OpenAI Vector Store ID (e.g.{' '}
            <code>vs_abc123</code>). STEMMY will still answer general STEM questions without it.
          </span>
        </div>
      )}

      {/* Main chat or welcome */}
      {hasMessages ? (
        <ChatInterface messages={messages} isLoading={isLoading} />
      ) : (
        <div className="welcome">
          <div className="welcome-avatar">⚛️</div>
          <div className="welcome-name">Hi, I'm STEMMY!</div>
          <div className="welcome-msg">
            Ask me anything about your homework or anything confusing in STEM!
          </div>
          <StarterQuestions onSelect={handleSend} />
        </div>
      )}

      {/* Achievement badges strip */}
      <AchievementBadges
        achievements={achievements}
        newBadge={newBadge}
        onDismissToast={clearNewBadge}
      />

      {/* Input */}
      <InputArea
        onSend={handleSend}
        isLoading={isLoading}
        uploadedFile={uploadedFile}
        onUpload={setUploadedFile}
        onClearUpload={() => setUploadedFile(null)}
      />
    </div>
  );
}
